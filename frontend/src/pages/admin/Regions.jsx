import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API = 'http://localhost:8080/api/admin';

const AdminRegions = () => {
    const [provinces, setProvinces] = useState([]);
    const [cities, setCities] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProv, setSelectedProv] = useState(0);
    const [selectedCity, setSelectedCity] = useState(0);

    const loadProvinces = () => {
        setLoading(true);
        fetch(`${API}/regions?parent_id=0`)
            .then(r => r.json())
            .then(d => setProvinces(d.data || []))
            .finally(() => setLoading(false));
    };

    const loadCities = (provId) => {
        fetch(`${API}/regions?parent_id=${provId}`)
            .then(r => r.json())
            .then(d => setCities(d.data || []));
    };

    const loadDistricts = (cityId) => {
        fetch(`${API}/regions?parent_id=${cityId}`)
            .then(r => r.json())
            .then(d => setDistricts(d.data || []));
    };

    useEffect(() => { loadProvinces(); }, []);

    const handleProvChange = (e) => {
        const id = e.target.value;
        setSelectedProv(id);
        setSelectedCity(0);
        setDistricts([]);
        if (id > 0) loadCities(id);
    };

    const handleCityChange = (e) => {
        const id = e.target.value;
        setSelectedCity(id);
        if (id > 0) loadDistricts(id);
    };

    return (
        <>
            <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
                <div className="breadcrumb-title pe-3">Master Data</div>
                <div className="ps-3">
                    <nav aria-label="breadcrumb">
                        <ol className="breadcrumb mb-0 p-0">
                            <li className="breadcrumb-item"><Link to="/admin"><i className="bx bx-home-alt"></i></Link></li>
                            <li className="breadcrumb-item active" aria-current="page">Data Geografis Indonesia</li>
                        </ol>
                    </nav>
                </div>
            </div>

            <div className="row g-3 h-100">
                <div className="col-12 col-lg-4">
                    <div className="card h-100 mb-0 shadow-none border">
                        <div className="card-header bg-light">
                            <h6 className="mb-0 fw-bold small">PROVINSI</h6>
                        </div>
                        <div className="card-body p-0" style={{maxHeight:'500px', overflowY:'auto'}}>
                            <div className="list-group list-group-flush">
                                {provinces.map(p => (
                                    <button key={p.id} onClick={() => handleProvChange({target:{value:p.id}})} 
                                        className={`list-group-item list-group-item-action ${selectedProv == p.id ? 'active' : ''}`}>
                                        <div className="d-flex w-100 justify-content-between align-items-center">
                                            <span className="small fw-bold">{p.name}</span>
                                            <i className="bi bi-chevron-right small"></i>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-lg-4">
                    <div className="card h-100 mb-0 shadow-none border">
                        <div className="card-header bg-light">
                            <h6 className="mb-0 fw-bold small">KOTA / KABUPATEN</h6>
                        </div>
                        <div className="card-body p-0" style={{maxHeight:'500px', overflowY:'auto'}}>
                             {!selectedProv ? (
                                <div className="p-4 text-center text-muted small">Pilih provinsi terlebih dahulu</div>
                             ) : (
                                <div className="list-group list-group-flush">
                                    {cities.map(c => (
                                        <button key={c.id} onClick={() => handleCityChange({target:{value:c.id}})} 
                                            className={`list-group-item list-group-item-action ${selectedCity == c.id ? 'active' : ''}`}>
                                            <div className="d-flex w-100 justify-content-between align-items-center">
                                                <span className="small">{c.name}</span>
                                                <i className="bi bi-chevron-right small"></i>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                             )}
                        </div>
                    </div>
                </div>

                <div className="col-12 col-lg-4">
                    <div className="card h-100 mb-0 shadow-none border">
                        <div className="card-header bg-light">
                            <h6 className="mb-0 fw-bold small">KECAMATAN / KODEPOS</h6>
                        </div>
                        <div className="card-body p-0" style={{maxHeight:'500px', overflowY:'auto'}}>
                            {!selectedCity ? (
                                <div className="p-4 text-center text-muted small">Pilih kota terlebih dahulu</div>
                            ) : (
                                <div className="list-group list-group-flush">
                                    {districts.map(d => (
                                        <div key={d.id} className="list-group-item border-bottom">
                                            <div className="d-flex align-items-center justify-content-between">
                                                <span className="small">{d.name}</span>
                                                <span className="badge bg-light-secondary text-secondary font-monospace" style={{fontSize:9}}>{d.zip_code}</span>
                                            </div>
                                        </div>
                                    ))}
                                    <button className="list-group-item text-primary small text-center py-3"><i className="bi bi-plus-circle me-1"></i>Tambah Data Baru</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-4 p-3 bg-light-info rounded d-flex gap-3 align-items-center">
                <i className="bi bi-info-circle-fill text-info fs-4"></i>
                <p className="mb-0 small text-muted">
                    Master data wilayah ini disinkronkan dengan basis data POS Indonesia dan Kurir partner. 
                    Gunakan <strong>Import CSV</strong> untuk melakukan update massal pada data kelurahan/kecamatan.
                </p>
            </div>
        </>
    );
};

export default AdminRegions;
