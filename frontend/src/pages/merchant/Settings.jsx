import React, { useState, useEffect } from 'react';
import { fetchJson, API_BASE, MERCHANT_API_BASE, formatImage, uploadFile, getSiteUrl } from '../../lib/api';
import { PageHeader, A, FieldLabel } from '../../lib/adminStyles.jsx';

const MerchantSettings = () => {
    const [store, setStore] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');
    const [searchingArea, setSearchingArea] = useState(false);
    const [areas, setAreas] = useState([]);
    const [activeTab, setActiveTab] = useState('branding'); // 'branding' | 'logistics'
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);

    useEffect(() => {
        fetchJson(`${MERCHANT_API_BASE}/store`)
            .then(res => setStore(res.data || res))
            .finally(() => setLoading(false));
    }, []);

    const handleChange = (e) => {
        setStore({ ...store, [e.target.name]: e.target.value });
    };

    const handleUpload = async (e, field) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        if (field === 'logo_url') setUploadingLogo(true);
        else setUploadingBanner(true);

        try {
            const res = await uploadFile(`${MERCHANT_API_BASE}/upload`, file);
            setStore({ ...store, [field]: res.url });
            setToast('Gambar berhasil diupload.');
            setTimeout(() => setToast(''), 4000);
        } catch (err) {
            alert('Upload gagal: ' + err.message);
        } finally {
            if (field === 'logo_url') setUploadingLogo(false);
            else setUploadingBanner(false);
        }
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
            setToast(activeTab === 'branding' ? 'Profil identitas berhasil diperbarui.' : 'Lokasi gudang pengiriman berhasil diperbarui.');
            setTimeout(() => setToast(''), 4000);
        } catch (_err) {
            alert('Update failed: ' + _err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSearchArea = async (input) => {
        if (input.length < 3) {
            setAreas([]);
            return;
        }
        setSearchingArea(true);
        try {
            const res = await fetchJson(`${API_BASE}/api/shipping/areas?input=${encodeURIComponent(input)}`);
            setAreas(res?.areas || (Array.isArray(res) ? res : []));
        } catch (_err) {
            console.error('Area search failed:', _err);
            setAreas([]);
        } finally {
            setSearchingArea(false);
        }
    };

    const handleSelectArea = async (area) => {
        const updatedStore = { 
            ...store, 
            biteship_area_id: area.id,
            area_name: area.name,
            city: area.administrative_division_level_2_name || area.city_name || '',
            province: area.administrative_division_level_1_name || area.province_name || '',
        };
        setStore(updatedStore);
        setAreas([]);

        // Auto-save the new location to the backend immediately
        setSaving(true);
        try {
            const res = await fetchJson(`${MERCHANT_API_BASE}/store/update`, {
                method: 'POST',
                body: JSON.stringify(updatedStore)
            });
            setStore(res.data || res);
            setToast('Lokasi gudang pengiriman berhasil diperbarui.');
            setTimeout(() => setToast(''), 4000);
        } catch (_err) {
            alert('Gagal menyimpan lokasi gudang: ' + _err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div style={A.page}>
            <div style={{ height: 450, background: 'linear-gradient(110deg, #f1f5f9 8%, #e2e8f0 18%, #f1f5f9 33%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite linear', borderRadius: 32 }} />
            <style>{`
                @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
            `}</style>
        </div>
    );

    // Placeholder if no image provided
    const bannerPreview = formatImage(store?.banner_url) || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80';
    const logoPreview = formatImage(store?.logo_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(store?.store_name || 'Store')}&size=200&background=6366f1&color=ffffff&bold=true`;

    return (
        <div style={{ ...A.page, padding: '24px 32px' }} className="fade-in">
            {/* Header section with modern title & dynamic save button */}
            <div className="responsive-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, gap: 16 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', margin: 0 }}>Pengaturan Toko</h1>
                    <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Kelola identitas visual, informasi operasional, dan lokasi pengiriman gudang Anda.</p>
                </div>
                <button 
                    onClick={handleSubmit} 
                    disabled={saving} 
                    style={{ 
                        background: 'linear-gradient(135deg, #4f46e5, #6366f1)', 
                        color: '#ffffff', 
                        padding: '12px 28px', 
                        borderRadius: 16, 
                        fontWeight: 800, 
                        fontSize: 13.5, 
                        border: 'none', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 8, 
                        cursor: 'pointer',
                        boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.3)',
                        transition: 'all 0.2s ease-in-out',
                        opacity: saving ? 0.7 : 1
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    {saving ? <i className="bx bx-loader-alt bx-spin" style={{ fontSize: 18 }} /> : <i className="bx bx-check-shield" style={{ fontSize: 18 }} />}
                    {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
            </div>

            {toast && (
                <div style={{ padding: '14px 20px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 16, color: '#047857', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, boxShadow: '0 4px 12px rgba(4, 120, 87, 0.05)', animation: 'slideDown 0.3s ease' }}>
                    <i className="bx bxs-check-shield" style={{ fontSize: 20, color: '#10b981' }} /> {toast}
                </div>
            )}

            {/* Premium Store Visual Preview Card (Absolute Wow Factor) */}
            <div style={{ position: 'relative', borderRadius: 28, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.06)', background: '#fff', border: '1px solid #f1f5f9', marginBottom: 32 }}>
                {/* Banner Image Preview */}
                <div style={{ height: 180, position: 'relative', overflow: 'hidden', background: '#e2e8f0' }}>
                    <img 
                        src={bannerPreview} 
                        alt="Banner Preview" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'all 0.5s ease' }} 
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.65))' }} />
                    
                    {/* Store Title & Quick Metadata overlayed on banner */}
                    <div className="responsive-banner-overlay" style={{ position: 'absolute', bottom: 20, left: 160, right: 24, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
                        <div>
                            <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0, letterSpacing: '-0.02em', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                                {store?.store_name || 'Nama Toko Anda'}
                            </h2>
                            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 4, fontFamily: 'monospace', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                {getSiteUrl()}/{store?.slug || 'slug-toko'}
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <span style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: 6, 
                                padding: '6px 14px', 
                                borderRadius: 12, 
                                fontSize: 11, 
                                fontWeight: 800, 
                                background: store?.is_verified ? 'rgba(16, 185, 129, 0.9)' : 'rgba(245, 158, 11, 0.9)', 
                                color: '#fff',
                                backdropFilter: 'blur(8px)',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                            }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
                                {store?.is_verified ? 'TERVERIFIKASI RESMI' : 'MENUNGGU VERIFIKASI'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Floating Logo overlay */}
                <div className="responsive-logo" style={{ 
                    position: 'absolute', 
                    bottom: 15, 
                    left: 32, 
                    width: 105, 
                    height: 105, 
                    borderRadius: 24, 
                    background: '#fff', 
                    padding: 4, 
                    boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
                    border: '1px solid #e2e8f0',
                    zIndex: 10
                }}>
                    <div style={{ width: '100%', height: '100%', borderRadius: 20, overflow: 'hidden', background: '#f8fafc' }}>
                        <img 
                            src={logoPreview} 
                            alt="Logo Preview" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                    </div>
                </div>

                {/* Blank space to offset the logo on layout */}
                <div className="responsive-preview-space" style={{ height: 48, background: '#ffffff' }} />
            </div>

            {/* Navigation Tabs bar */}
            <div style={{ display: 'flex', gap: 12, borderBottom: '2px solid #f1f5f9', paddingBottom: 2, marginBottom: 32 }}>
                <button 
                    onClick={() => setActiveTab('branding')}
                    style={{ 
                        padding: '12px 24px', 
                        fontSize: 14, 
                        fontWeight: 800, 
                        color: activeTab === 'branding' ? '#4f46e5' : '#64748b', 
                        border: 'none', 
                        background: 'none', 
                        cursor: 'pointer', 
                        position: 'relative',
                        transition: 'all 0.2s'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="bx bx-store-alt" style={{ fontSize: 18 }} /> Identitas & Branding
                    </div>
                    {activeTab === 'branding' && (
                        <div style={{ position: 'absolute', bottom: -4, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #4f46e5, #818cf8)', borderRadius: 2 }} />
                    )}
                </button>

                <button 
                    onClick={() => setActiveTab('logistics')}
                    style={{ 
                        padding: '12px 24px', 
                        fontSize: 14, 
                        fontWeight: 800, 
                        color: activeTab === 'logistics' ? '#4f46e5' : '#64748b', 
                        border: 'none', 
                        background: 'none', 
                        cursor: 'pointer', 
                        position: 'relative',
                        transition: 'all 0.2s'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="bx bx-map-pin" style={{ fontSize: 18 }} /> Lokasi & Gudang Pengiriman
                    </div>
                    {activeTab === 'logistics' && (
                        <div style={{ position: 'absolute', bottom: -4, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #4f46e5, #818cf8)', borderRadius: 2 }} />
                    )}
                </button>
            </div>

            {/* TAB CONTENT */}
            {activeTab === 'branding' ? (
                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 32 }}>
                    
                    {/* Identity Form Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div style={{ ...A.card, padding: 32, borderRadius: 24, boxShadow: '0 10px 30px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
                            <h3 style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '-0.01em' }}>
                                <i className="bx bx-store" style={{ color: '#4f46e5' }} /> Profil Utama Toko
                            </h3>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                <div>
                                    <FieldLabel>Nama Resmi Toko</FieldLabel>
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        <i className="bx bx-rename" style={{ position: 'absolute', left: 16, color: '#94a3b8', fontSize: 18 }} />
                                        <input 
                                            name="store_name" 
                                            value={store?.store_name || ''} 
                                            onChange={handleChange} 
                                            style={{ ...A.input, paddingLeft: 46, fontWeight: 700, color: '#0f172a' }} 
                                            required 
                                        />
                                    </div>
                                </div>

                                <div>
                                    <FieldLabel>Slug Toko Digital (URL Toko Pelanggan)</FieldLabel>
                                    <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', borderRadius: 14, border: '1px solid #e2e8f0', transition: 'border-color 0.2s' }}>
                                        <span style={{ padding: '0 16px', fontSize: 12, fontWeight: 800, color: '#64748b', background: '#f1f5f9', alignSelf: 'stretch', display: 'flex', alignItems: 'center', borderRight: '1px solid #e2e8f0' }}>
                                            {getSiteUrl().replace(/^https?:\/\//, '')}/
                                        </span>
                                        <input 
                                            name="slug" 
                                            value={store?.slug || ''} 
                                            onChange={handleChange} 
                                            style={{ ...A.input, border: 'none', background: 'transparent', flex: 1, padding: 14, fontFamily: 'monospace', color: '#4f46e5', fontWeight: 800 }} 
                                            required 
                                        />
                                    </div>
                                    <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 8, fontStyle: 'italic' }}>
                                        * Mengubah slug dapat memutus tautan promosi Anda yang sudah disebarkan sebelumnya.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div style={{ ...A.card, padding: 32, borderRadius: 24, boxShadow: '0 10px 30px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
                            <h3 style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '-0.01em' }}>
                                <i className="bx bx-image" style={{ color: '#4f46e5' }} /> Pengaturan Aset Media
                            </h3>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                <div>
                                    <FieldLabel>Logo Brand (Rasio 1:1)</FieldLabel>
                                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1 }}>
                                            <i className="bx bx-link-alt" style={{ position: 'absolute', left: 16, color: '#94a3b8', fontSize: 18 }} />
                                            <input 
                                                name="logo_url" 
                                                value={store?.logo_url || ''} 
                                                onChange={handleChange} 
                                                style={{ ...A.input, paddingLeft: 46 }} 
                                                placeholder="Masukkan URL Logo Anda..." 
                                            />
                                        </div>
                                        <label style={{ ...A.btnGhost, background: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                                            {uploadingLogo ? <i className="bx bx-loader-alt bx-spin" /> : <i className="bx bx-upload" />}
                                            {uploadingLogo ? 'Mengupload...' : 'Upload Lokal'}
                                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleUpload(e, 'logo_url')} disabled={uploadingLogo} />
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <FieldLabel>Banner Toko (Rasio 16:9)</FieldLabel>
                                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1 }}>
                                            <i className="bx bx-image-add" style={{ position: 'absolute', left: 16, color: '#94a3b8', fontSize: 18 }} />
                                            <input 
                                                name="banner_url" 
                                                value={store?.banner_url || ''} 
                                                onChange={handleChange} 
                                                style={{ ...A.input, paddingLeft: 46 }} 
                                                placeholder="Masukkan URL Banner Anda..." 
                                            />
                                        </div>
                                        <label style={{ ...A.btnGhost, background: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                                            {uploadingBanner ? <i className="bx bx-loader-alt bx-spin" /> : <i className="bx bx-upload" />}
                                            {uploadingBanner ? 'Mengupload...' : 'Upload Lokal'}
                                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleUpload(e, 'banner_url')} disabled={uploadingBanner} />
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <FieldLabel>Deskripsi & Biografi Singkat Toko</FieldLabel>
                                    <textarea 
                                        name="description" 
                                        value={store?.description || ''} 
                                        onChange={handleChange} 
                                        rows="4" 
                                        style={{ ...A.input, resize: 'none', lineHeight: 1.6, padding: '14px 18px' }} 
                                        placeholder="Ceritakan sejarah singkat toko, moto bisnis, atau jam pelayanan aktif Anda..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Info side card */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        {/* Store Statistics Widget */}
                        <div style={{ ...A.card, padding: 28, borderRadius: 24, border: '1px solid #f1f5f9' }}>
                            <h4 style={{ fontSize: 13, fontWeight: 950, color: '#0f172a', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Informasi Tambahan</h4>
                            
                            <div style={{ display: 'flex', gap: 16, alignItems: 'center', background: '#f8fafc', padding: '16px 20px', borderRadius: 16, border: '1px solid #f1f5f9' }}>
                                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#eef2ff', display: 'flex', alignItems: 'center', justify: 'center', flexShrink: 0 }}>
                                    <i className="bx bx-calendar" style={{ fontSize: 22, color: '#4f46e5', margin: 'auto' }} />
                                </div>
                                <div>
                                    <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600 }}>Tanggal Terdaftar</div>
                                    <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                                        {store?.joined_at ? new Date(store.joined_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* TAB 2: LOGISTICS & WAREHOUSE */
                <div style={{ ...A.card, padding: 36, borderRadius: 28, border: '1px solid #f1f5f9', boxShadow: '0 10px 30px rgba(0,0,0,0.02)', overflow: 'visible' }}>
                    <div style={{ maxWidth: 640 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <i className="bx bx-truck" style={{ color: '#4f46e5', fontSize: 22 }} /> Lokasi Gudang Pengiriman (Biteship)
                        </h3>
                        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 28, lineHeight: 1.6 }}>
                            Wilayah gudang ini digunakan secara real-time untuk menghitung rute, jangkauan kurir ekspedisi, serta estimasi biaya ongkos kirim pelanggan.
                        </p>

                        <div style={{ position: 'relative', marginBottom: 24 }}>
                            <FieldLabel>Cari Lokasi Wilayah (Kecamatan / Kota / Kabupaten)</FieldLabel>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <i className="bx bx-search" style={{ position: 'absolute', left: 16, color: '#94a3b8', fontSize: 18 }} />
                                <input 
                                    type="text" 
                                    placeholder="Ketik minimal 3 huruf nama kecamatan atau kota..." 
                                    style={{ ...A.input, paddingLeft: 46 }} 
                                    onChange={(e) => handleSearchArea(e.target.value)}
                                />
                                {searchingArea && (
                                    <div style={{ position: 'absolute', right: 16, animation: 'pulse 1s infinite' }}>
                                        <i className="bx bx-loader-alt bx-spin" style={{ color: '#4f46e5', fontSize: 18 }} />
                                    </div>
                                )}
                            </div>

                            {areas.length > 0 && (
                                <div style={{ 
                                    position: 'absolute', 
                                    zIndex: 50, 
                                    left: 0, 
                                    right: 0, 
                                    marginTop: 8, 
                                    background: '#ffffff', 
                                    border: '1px solid #e2e8f0', 
                                    borderRadius: 16, 
                                    boxShadow: '0 20px 30px rgba(0,0,0,0.08)', 
                                    maxHeight: 240, 
                                    overflowY: 'auto' 
                                }}>
                                    {areas.map(a => (
                                        <div 
                                            key={a.id} 
                                            onClick={() => handleSelectArea(a)}
                                            style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'all 0.15s' }}
                                            onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                                            onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}
                                        >
                                            <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{a.name}</div>
                                            <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                                                {a.administrative_division_level_2_name || a.city_name || ''}, {a.administrative_division_level_1_name || a.province_name || ''} ({a.postal_code || '-'})
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {store?.biteship_area_id ? (
                            <div style={{ 
                                marginTop: 32, 
                                padding: 24, 
                                background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', 
                                borderRadius: 20, 
                                border: '1px solid #bbf7d0', 
                                display: 'flex', 
                                gap: 20, 
                                alignItems: 'flex-start',
                                boxShadow: '0 10px 20px rgba(16, 185, 129, 0.02)'
                            }}>
                                <div style={{ width: 48, height: 48, borderRadius: 14, background: '#d1fae5', display: 'flex', alignItems: 'center', justify: 'center', color: '#10b981', flexShrink: 0 }}>
                                    <i className="bx bxs-check-shield" style={{ fontSize: 24, margin: 'auto' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 11, fontWeight: 900, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Biteship API Area Terkunci</div>
                                    <div style={{ fontSize: 16, fontWeight: 900, color: '#166534', marginTop: 4 }}>
                                        {store.area_name || 'Kecamatan Terpilih'}
                                    </div>
                                    <div style={{ fontSize: 13, color: '#15803d', marginTop: 2, fontWeight: 600 }}>
                                        {store.city}, {store.province}
                                    </div>
                                    <div style={{ display: 'inline-block', fontSize: 11, fontFamily: 'monospace', fontWeight: 800, color: '#047857', background: '#d1fae5', padding: '4px 10px', borderRadius: 8, marginTop: 10 }}>
                                        ID: {store.biteship_area_id}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ 
                                marginTop: 32, 
                                padding: 24, 
                                background: '#fffbeb', 
                                borderRadius: 20, 
                                border: '1px solid #fef3c7', 
                                display: 'flex', 
                                gap: 16, 
                                alignItems: 'center'
                            }}>
                                <i className="bx bx-error-circle" style={{ color: '#d97706', fontSize: 24 }} />
                                <div>
                                    <div style={{ fontSize: 13.5, fontWeight: 800, color: '#92400e' }}>Lokasi Pengiriman Belum Dikaitkan</div>
                                    <p style={{ fontSize: 12, color: '#b45309', marginTop: 2 }}>Silakan gunakan pencarian di atas untuk menghubungkan koordinat logistik toko Anda.</p>
                                </div>
                            </div>
                        )}

                        {/* Dedicated Save Button for Logistics Tab */}
                        <div style={{ marginTop: 32, borderTop: '1px solid #f1f5f9', paddingTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={handleSubmit}
                                disabled={saving}
                                style={{
                                    background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                                    color: '#ffffff',
                                    padding: '12px 28px',
                                    borderRadius: 16,
                                    fontWeight: 800,
                                    fontSize: 13.5,
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    cursor: 'pointer',
                                    boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.3)',
                                    transition: 'all 0.2s ease-in-out',
                                    opacity: saving ? 0.7 : 1
                                }}
                                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                {saving ? <i className="bx bx-loader-alt bx-spin" style={{ fontSize: 18 }} /> : <i className="bx bx-save" style={{ fontSize: 18 }} />}
                                {saving ? 'Menyimpan...' : 'Simpan Lokasi Gudang'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <style>{`
                @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
                @keyframes slideDown { 0% { transform: translateY(-10px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
                
                @media (max-width: 991px) {
                    .responsive-grid {
                        grid-template-columns: 1fr !important;
                        gap: 24px !important;
                    }
                    .responsive-header {
                        flex-direction: column !important;
                        align-items: flex-start !important;
                    }
                    .responsive-banner-overlay {
                        position: relative !important;
                        left: 20px !important;
                        right: 20px !important;
                        bottom: 0 !important;
                        margin-top: 100px !important;
                        flex-direction: column !important;
                        align-items: flex-start !important;
                        gap: 8px !important;
                        background: rgba(15, 23, 42, 0.7) !important;
                        padding: 16px !important;
                        border-radius: 16px !important;
                        backdrop-filter: blur(8px) !important;
                        width: calc(100% - 40px) !important;
                    }
                    .responsive-logo {
                        bottom: auto !important;
                        top: 20px !important;
                        left: 20px !important;
                        width: 80px !important;
                        height: 80px !important;
                    }
                    .responsive-preview-space {
                        height: 12px !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default MerchantSettings;

