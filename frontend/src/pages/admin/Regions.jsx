import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';

const API = ADMIN_API_BASE;

const S = {
  page: { fontFamily: "'Inter', sans-serif", paddingTop: 20 },
  card: { background: '#fff', borderRadius: 16, border: '1px solid #f0f0f5', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' },
  cardHeader: (color) => ({ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', background: color + '08', display: 'flex', alignItems: 'center', gap: 8 }),
  headerTitle: { fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.5px', textTransform: 'uppercase' },
  listItem: (active) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', cursor: 'pointer', transition: 'all 0.15s', borderBottom: '1px solid #f8fafc',
    background: active ? '#4361ee' : 'transparent', color: active ? '#fff' : '#334155',
  }),
  districtItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', borderBottom: '1px solid #f8fafc' },
};

export default function AdminRegions() {
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [selectedProv, setSelectedProv] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  useEffect(() => {
    fetchJson(`${API}/regions?parent_id=0`)
      .then(d => setProvinces(d || []));
  }, []);

  const handleProvClick = (prov) => {
    setSelectedProv(prov);
    setSelectedCity(null);
    setDistricts([]);
    setLoadingCities(true);
    fetchJson(`${API}/regions?parent_id=${prov.id}`)
      .then(d => setCities(d || []))
      .finally(() => setLoadingCities(false));
  };

  const handleCityClick = (city) => {
    setSelectedCity(city);
    setLoadingDistricts(true);
    fetchJson(`${API}/regions?parent_id=${city.id}`)
      .then(d => setDistricts(d || []))
      .finally(() => setLoadingDistricts(false));
  };

  return (
    <div style={S.page} className="fade-in">
      {/* Breadcrumb */}
      <div className="d-none d-sm-flex align-items-center gap-2 mb-4">
        <span style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Master Data</span>
        <i className="bx bx-chevron-right" style={{ color: '#cbd5e1', fontSize: 20 }} />
        <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 500 }}>Data Geografis Indonesia</span>
      </div>

      {/* Info Banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, marginBottom: 24 }}>
        <i className="bx bx-map" style={{ fontSize: 22, color: '#2563eb', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1e40af' }}>Data Wilayah Indonesia</div>
          <div style={{ fontSize: 12.5, color: '#3b82f6', marginTop: 2 }}>
            Data ini digunakan untuk pengiriman, validasi alamat, dan konfigurasi ongkir. Klik provinsi untuk menjelajahi.
          </div>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1e40af', background: '#dbeafe', padding: '4px 12px', borderRadius: 20 }}>
          {provinces.length} Provinsi
        </span>
      </div>

      {/* 3-column explorer */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, alignItems: 'start' }}>

        {/* Provinsi */}
        <div style={S.card}>
          <div style={S.cardHeader('#4361ee')}>
            <i className="bx bx-map-pin" style={{ fontSize: 16, color: '#4361ee' }} />
            <span style={S.headerTitle}>Provinsi ({provinces.length})</span>
          </div>
          <div style={{ maxHeight: 480, overflowY: 'auto' }}>
            {provinces.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 13 }}>
                <i className="bx bx-loader-alt" style={{ fontSize: 24, display: 'block', marginBottom: 8 }} />
                Memuat...
              </div>
            ) : provinces.map(p => (
              <div key={p.id} style={S.listItem(selectedProv?.id === p.id)}
                onClick={() => handleProvClick(p)}
                onMouseEnter={e => { if (selectedProv?.id !== p.id) e.currentTarget.style.background = '#f0f7ff'; }}
                onMouseLeave={e => { if (selectedProv?.id !== p.id) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{p.name}</span>
                <i className="bx bx-chevron-right" style={{ fontSize: 18, opacity: 0.7 }} />
              </div>
            ))}
          </div>
        </div>

        {/* Kota/Kabupaten */}
        <div style={S.card}>
          <div style={S.cardHeader('#10b981')}>
            <i className="bx bx-buildings" style={{ fontSize: 16, color: '#10b981' }} />
            <span style={S.headerTitle}>Kota / Kabupaten {cities.length > 0 ? `(${cities.length})` : ''}</span>
          </div>
          <div style={{ maxHeight: 480, overflowY: 'auto' }}>
            {!selectedProv ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                <i className="bx bx-arrow-back" style={{ fontSize: 32, display: 'block', marginBottom: 8, opacity: 0.4 }} />
                <div style={{ fontSize: 13 }}>Pilih provinsi dahulu</div>
              </div>
            ) : loadingCities ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div className="spinner-border spinner-border-sm" style={{ color: '#10b981' }} />
              </div>
            ) : cities.map(c => (
              <div key={c.id} style={S.listItem(selectedCity?.id === c.id)}
                onClick={() => handleCityClick(c)}
                onMouseEnter={e => { if (selectedCity?.id !== c.id) e.currentTarget.style.background = '#f0fdf4'; }}
                onMouseLeave={e => { if (selectedCity?.id !== c.id) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{c.name}</span>
                <i className="bx bx-chevron-right" style={{ fontSize: 18, opacity: 0.7 }} />
              </div>
            ))}
          </div>
        </div>

        {/* Kecamatan */}
        <div style={S.card}>
          <div style={S.cardHeader('#f59e0b')}>
            <i className="bx bx-home-circle" style={{ fontSize: 16, color: '#f59e0b' }} />
            <span style={S.headerTitle}>Kecamatan {districts.length > 0 ? `(${districts.length})` : ''}</span>
          </div>
          <div style={{ maxHeight: 480, overflowY: 'auto' }}>
            {!selectedCity ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                <i className="bx bx-arrow-back" style={{ fontSize: 32, display: 'block', marginBottom: 8, opacity: 0.4 }} />
                <div style={{ fontSize: 13 }}>Pilih kota dahulu</div>
              </div>
            ) : loadingDistricts ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div className="spinner-border spinner-border-sm" style={{ color: '#f59e0b' }} />
              </div>
            ) : districts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8', fontSize: 13 }}>
                Tidak ada data kecamatan
              </div>
            ) : districts.map(d => (
              <div key={d.id} style={S.districtItem}>
                <span style={{ fontSize: 13.5, fontWeight: 500, color: '#334155' }}>{d.name}</span>
                {d.zip_code && (
                  <span style={{ fontFamily: 'monospace', fontSize: 11.5, fontWeight: 700, color: '#4361ee', background: '#eff6ff', padding: '2px 8px', borderRadius: 6 }}>
                    {d.zip_code}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
