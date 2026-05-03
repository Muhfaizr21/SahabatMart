import React, { useState, useEffect } from 'react';
import { fetchJson, MERCHANT_API_BASE, formatImage } from '../../lib/api';
import { PageHeader, A, FieldLabel, idr } from '../../lib/adminStyles.jsx';

const MerchantSettings = () => {
    const [store, setStore] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');
    const [searchingArea, setSearchingArea] = useState(false);
    const [areas, setAreas] = useState([]);

    useEffect(() => {
        fetchJson(`${MERCHANT_API_BASE}/store`)
            .then(res => setStore(res.data || res))
            .finally(() => setLoading(false));
    }, []);

    const handleChange = (e) => {
        setStore({ ...store, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        try {
            const res = await fetchJson(`${MERCHANT_API_BASE}/store/update`, {
                method: 'POST',
                body: JSON.stringify(store)
            });
            setStore(res.data || res);
            setToast('Profil identitas berhasil diperbarui.');
            setTimeout(() => setToast(''), 4000);
        } catch (err) {
            alert('Update failed: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSearchArea = async (input) => {
        if (input.length < 3) return;
        setSearchingArea(true);
        try {
            const res = await fetchJson(`/api/shipping/areas?input=${input}`);
            setAreas(res.areas || []);
        } catch (err) {
            console.error('Area search failed:', err);
        } finally {
            setSearchingArea(true);
            setTimeout(() => setSearchingArea(false), 500);
        }
    };

    const handleSelectArea = (area) => {
        setStore({ 
            ...store, 
            biteship_area_id: area.id,
            area_name: area.name,
            city: area.city_name
        });
        setAreas([]);
    };

    if (loading) return (
        <div style={A.page}>
            <div style={{ height: 400, background: '#f8fafc', borderRadius: 24, animation: 'pulse 1.5s infinite' }} />
        </div>
    );

    return (
        <div style={A.page} className="fade-in">
            <PageHeader title="Identitas & Branding" subtitle="Tentukan identitas Anda. Atur bagaimana merek Anda tampil di hadapan pelanggan.">
                <button 
                   onClick={handleSubmit} 
                   disabled={saving} 
                   style={{ ...A.btnPrimary, background: 'linear-gradient(135deg, #0f172a, #334155)', padding: '12px 24px' }}
                >
                   {saving ? <i className="bx bx-loader-alt bx-spin" /> : <i className="bx bx-save" />} Simpan Perubahan
                </button>
            </PageHeader>

            {toast && (
                <div style={{ padding: '14px 20px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, color: '#16a34a', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                    <i className="bx bxs-check-shield" style={{ fontSize: 20 }} /> {toast}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
                {/* Visual Identity Section */}
                <div style={{ ...A.card, padding: 32 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', marginBottom: 24, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <i className="bx bx-palette" style={{ color: '#6366f1' }} /> Aset Visual
                    </h3>
                    
                    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginBottom: 32 }}>
                        <div style={{ position: 'relative' }}>
                            <div style={{ width: 120, height: 120, borderRadius: 24, background: '#fff', border: '4px solid #fff', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', overflow: 'hidden', ring: '1px solid #f1f5f9' }}>
                                <img src={formatImage(store?.logo_url) || 'https://ui-avatars.com/api/?name=Store&size=200&background=eef2ff&color=6366f1'} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <div style={{ position: 'absolute', bottom: -10, right: -10, width: 36, height: 36, borderRadius: 12, background: '#0f172a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', cursor: 'pointer' }}>
                                <i className="bx bx-camera" />
                            </div>
                        </div>

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <FieldLabel>URL Logo Brand</FieldLabel>
                                <input name="logo_url" value={store?.logo_url || ''} onChange={handleChange} style={A.input} placeholder="https://..." />
                            </div>
                            <div>
                                <FieldLabel>URL Banner Toko</FieldLabel>
                                <input name="banner_url" value={store?.banner_url || ''} onChange={handleChange} style={A.input} placeholder="https://..." />
                            </div>
                        </div>
                    </div>

                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 24 }}>
                        <FieldLabel>Deskripsi Toko & Manifesto</FieldLabel>
                        <textarea 
                            name="description" 
                            value={store?.description || ''} 
                            onChange={handleChange} 
                            rows="6" 
                            style={{ ...A.input, resize: 'none', lineHeight: 1.6 }} 
                            placeholder="Ceritakan pada dunia tentang komitmen Anda terhadap kualitas dan layanan..."
                        />
                    </div>
                </div>

                {/* Metadata Section */}
                <div style={{ ...A.card, padding: 32 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', marginBottom: 24, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <i className="bx bx-cog" style={{ color: '#6366f1' }} /> Konfigurasi Toko
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div>
                            <FieldLabel>Nama Resmi Toko</FieldLabel>
                            <input name="store_name" value={store?.store_name || ''} onChange={handleChange} style={{ ...A.input, fontSize: 16, fontWeight: 800 }} required />
                        </div>

                        <div>
                            <FieldLabel>Slug Toko Digital (URL Permanen)</FieldLabel>
                            <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', borderRadius: 14, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                <span style={{ padding: '0 16px', fontSize: 12, fontWeight: 800, color: '#94a3b8', background: '#f1f5f9', height: '100%', display: 'flex', alignItems: 'center', fontFamily: 'monospace' }}>{window.location.host}/shop/</span>
                                <input name="slug" value={store?.slug || ''} onChange={handleChange} style={{ ...A.input, border: 'none', background: 'transparent', flex: 1, padding: 14, fontFamily: 'monospace', color: '#6366f1', fontWeight: 800 }} required />
                            </div>
                            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 8, fontStyle: 'italic' }}>* Mengubah slug dapat mempengaruhi link yang sudah terindeks dan peringkat SEO.</p>
                        </div>

                        <div style={{ marginTop: 20, padding: 20, background: '#f0f4ff', borderRadius: 16, border: '1px solid #e0e7ff' }}>
                             <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                <i className="bx bxs-info-circle" style={{ color: '#4f46e5', fontSize: 20 }} />
                                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#3730a3' }}>Status Verifikasi & Biaya Layanan</div>
                             </div>
                             <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: store?.is_verified ? '#10b981' : '#f59e0b' }} />
                                    <span style={{ fontSize: 13, fontWeight: 800, color: store?.is_verified ? '#059669' : '#b45309' }}>
                                        {store?.is_verified ? 'MITRA TERVERIFIKASI RESMI' : 'MENUNGGU VERIFIKASI'}
                                    </span>
                                </div>
                                <div style={{ background: '#4f46e5', color: '#fff', padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 800 }}>
                                    FEE: {store?.service_fee || 5}%
                                </div>
                             </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 10 }}>
                            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 14, border: '1px solid #e2e8f0' }}>
                                <FieldLabel>Total Penjualan</FieldLabel>
                                <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>{idr(store?.total_sales)}</div>
                            </div>
                            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 14, border: '1px solid #e2e8f0' }}>
                                <FieldLabel>Bergabung Sejak</FieldLabel>
                                <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>
                                    {store?.joined_at ? new Date(store.joined_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: 24, padding: 24, background: '#f8fafc', borderRadius: 20, border: '1px solid #e2e8f0' }}>
                            <h4 style={{ fontSize: 14, fontWeight: 900, color: '#0f172a', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <i className="bx bx-map-pin" style={{ color: '#6366f1' }} /> Lokasi Gudang / Pengiriman
                            </h4>
                            <p style={{ fontSize: 11, color: '#64748b', marginBottom: 16 }}>Digunakan untuk menghitung ongkos kirim real-time bagi pelanggan Anda.</p>
                            
                            <div style={{ position: 'relative' }}>
                                <FieldLabel>Cari Wilayah (Kecamatan/Kota)</FieldLabel>
                                <input 
                                    type="text" 
                                    placeholder="Ketik min. 3 huruf..." 
                                    style={A.input} 
                                    onChange={(e) => handleSearchArea(e.target.value)}
                                />
                                {searchingArea && <div style={{ position: 'absolute', right: 12, top: 40, fontSize: 10, color: '#6366f1', animation: 'pulse 1s infinite' }}>Mencari...</div>}
                                
                                {areas.length > 0 && (
                                    <div style={{ position: 'absolute', zIndex: 50, left: 0, right: 0, mt: 4, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxH: 240, overflowY: 'auto' }}>
                                        {areas.map(a => (
                                            <div 
                                                key={a.id} 
                                                onClick={() => handleSelectArea(a)}
                                                style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'all 0.2s' }}
                                                onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                                                onMouseOut={(e) => e.currentTarget.style.background = '#fff'}
                                            >
                                                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{a.name}</div>
                                                <div style={{ fontSize: 11, color: '#64748b' }}>{a.city_name}, {a.province_name} ({a.postal_code})</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {store?.biteship_area_id && (
                                <div style={{ marginTop: 16, padding: '12px 16px', background: '#ecfdf5', borderRadius: 12, border: '1px solid #d1fae5', display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <i className="bx bxs-check-circle" style={{ color: '#10b981', fontSize: 18 }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 10, fontWeight: 800, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Biteship Area ID Terhubung</div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: '#065f46' }}>{store.biteship_area_id}</div>
                                        {store.area_name && <div style={{ fontSize: 11, color: '#059669' }}>{store.area_name}</div>}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            <style>{`
                @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
            `}</style>
        </div>
    );
};

export default MerchantSettings;
