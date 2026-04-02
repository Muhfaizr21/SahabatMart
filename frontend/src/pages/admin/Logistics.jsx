import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';

const API = ADMIN_API_BASE;

const AdminLogistics = () => {
    const [channels, setChannels] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadLogistics = () => {
        fetchJson(`${API}/logistics`)
            .then(d => setChannels(d.data || []))
            .catch(err => console.error("Error loading logistics:", err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchJson(`${API}/logistics`)
            .then(d => setChannels(d.data || []))
            .catch(err => console.error("Error loading logistics:", err))
            .finally(() => setLoading(false));
    }, []);

    const toggleChannelStatus = (id, active) => {
        setLoading(true);
        fetch(`${API}/logistics/toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, active }),
        }).then(() => loadLogistics());
    };

    return (
        <>
            <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
                <div className="breadcrumb-title pe-3">Integrasi Ekosistem</div>
                <div className="ps-3">
                    <nav aria-label="breadcrumb">
                        <ol className="breadcrumb mb-0 p-0">
                            <li className="breadcrumb-item"><Link to="/admin"><i className="bx bx-home-alt"></i></Link></li>
                            <li className="breadcrumb-item active" aria-current="page">Saluran Logistik</li>
                        </ol>
                    </nav>
                </div>
            </div>

            <div className="row g-4">
                <div className="col-12 col-md-8 col-lg-6 mx-auto">
                    <div className="card shadow-none border">
                        <div className="card-header py-3 bg-light">
                            <h6 className="mb-0 fw-bold">Daftar Kurir & Partner Logistik</h6>
                            <p className="mb-0 text-muted" style={{fontSize:11}}>Aktifkan/nonaktifkan ekspedisi yang tersedia untuk merchant.</p>
                        </div>
                        <div className="card-body">
                            {loading ? (
                                <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
                            ) : channels.length === 0 ? (
                                <div className="text-center py-4 text-muted">Belum ada data logistik.</div>
                            ) : (
                                <div className="list-group list-group-flush border rounded overflow-hidden">
                                    {channels.map(c => (
                                        <div key={c.id} className="list-group-item d-flex align-items-center py-3 gap-3">
                                            <div className="product-box border rounded p-2" style={{width: 50, height: 50, flexShrink:0}}>
                                                <img src={`/admin-assets/images/icons/${c.code.toLowerCase()}.png`} 
                                                    onError={(e) => e.target.src='/admin-assets/images/icons/truck.png'} alt={c.name} style={{width:'100%'}} />
                                            </div>
                                            <div className="flex-grow-1">
                                                <h6 className="mb-0 fw-bold">{c.name}</h6>
                                                <code className="text-muted small" style={{fontSize:10}}>{c.code.toUpperCase()}</code>
                                            </div>
                                            <div className="form-check form-switch">
                                                <input className="form-check-input" type="checkbox" id={`channel-${c.id}`}
                                                    checked={c.is_active} onChange={e => toggleChannelStatus(c.id, e.target.checked)} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="card-footer bg-light-warning py-2 text-center" style={{fontSize:11}}>
                            <i className="bi bi-info-circle me-1"></i> Perubahan status logistik berdampak pada semua merchant aktif.
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AdminLogistics;
