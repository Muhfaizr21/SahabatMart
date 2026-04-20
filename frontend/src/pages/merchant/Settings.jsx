import React, { useState, useEffect } from 'react';
import { fetchJson, MERCHANT_API_BASE, formatImage } from '../../lib/api';
import { PageHeader, A, FieldLabel, idr } from '../../lib/adminStyles.jsx';

const MerchantSettings = () => {
    const [store, setStore] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');

    useEffect(() => {
        fetchJson(`${MERCHANT_API_BASE}/store`)
            .then(res => setStore(res || {}))
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
            setToast('Identity profiles successfully committed to the blockchain ledger.');
            setTimeout(() => setToast(''), 4000);
        } catch (err) {
            alert('Update failed: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div style={A.page}>
            <div style={{ height: 400, background: '#f8fafc', borderRadius: 24, animation: 'pulse 1.5s infinite' }} />
        </div>
    );

    return (
        <div style={A.page} className="fade-in">
            <PageHeader title="Identity & Branding" subtitle="Define your legacy. Customize how your brand appears to millions of customers.">
                <button 
                   onClick={handleSubmit} 
                   disabled={saving} 
                   style={{ ...A.btnPrimary, background: 'linear-gradient(135deg, #0f172a, #334155)', padding: '12px 24px' }}
                >
                   {saving ? <i className="bx bx-loader-alt bx-spin" /> : <i className="bx bx-save" />} Commit Changes
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
                        <i className="bx bx-palette" style={{ color: '#6366f1' }} /> Visual Assets
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
                                <FieldLabel>Brand Logo URL</FieldLabel>
                                <input name="logo_url" value={store?.logo_url || ''} onChange={handleChange} style={A.input} placeholder="https://..." />
                            </div>
                            <div>
                                <FieldLabel>Store Banner URL</FieldLabel>
                                <input name="banner_url" value={store?.banner_url || ''} onChange={handleChange} style={A.input} placeholder="https://..." />
                            </div>
                        </div>
                    </div>

                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 24 }}>
                        <FieldLabel>Store Description & Manifesto</FieldLabel>
                        <textarea 
                            name="description" 
                            value={store?.description || ''} 
                            onChange={handleChange} 
                            rows="6" 
                            style={{ ...A.input, resize: 'none', lineHeight: 1.6 }} 
                            placeholder="Tell the world about your commitment to quality and service..."
                        />
                    </div>
                </div>

                {/* Metadata Section */}
                <div style={{ ...A.card, padding: 32 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', marginBottom: 24, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <i className="bx bx-cog" style={{ color: '#6366f1' }} /> Store Configuration
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div>
                            <FieldLabel>Official Establishment Name</FieldLabel>
                            <input name="store_name" value={store?.store_name || ''} onChange={handleChange} style={{ ...A.input, fontSize: 16, fontWeight: 800 }} required />
                        </div>

                        <div>
                            <FieldLabel>Digital Storefront Slug (Permanent URL)</FieldLabel>
                            <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', borderRadius: 14, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                <span style={{ padding: '0 16px', fontSize: 12, fontWeight: 800, color: '#94a3b8', background: '#f1f5f9', height: '100%', display: 'flex', alignItems: 'center', fontFamily: 'monospace' }}>sahabatmart.com/shop/</span>
                                <input name="slug" value={store?.slug || ''} onChange={handleChange} style={{ ...A.input, border: 'none', background: 'transparent', flex: 1, padding: 14, fontFamily: 'monospace', color: '#6366f1', fontWeight: 800 }} required />
                            </div>
                            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 8, fontStyle: 'italic' }}>* Changing your slug may affect existing indexed links and SEO rankings.</p>
                        </div>

                        <div style={{ marginTop: 20, padding: 20, background: '#f0f4ff', borderRadius: 16, border: '1px solid #e0e7ff' }}>
                             <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                <i className="bx bxs-info-circle" style={{ color: '#4f46e5', fontSize: 20 }} />
                                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#3730a3' }}>Store Verification Status</div>
                             </div>
                             <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: store?.is_verified ? '#10b981' : '#f59e0b' }} />
                                <span style={{ fontSize: 13, fontWeight: 800, color: store?.is_verified ? '#059669' : '#b45309' }}>
                                    {store?.is_verified ? 'OFFICIALLY VERIFIED TENANT' : 'PENDING VERIFICATION'}
                                </span>
                             </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 10 }}>
                            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 14, border: '1px solid #e2e8f0' }}>
                                <FieldLabel>Total Legacy Sales</FieldLabel>
                                <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>{idr(store?.total_sales)}</div>
                            </div>
                            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 14, border: '1px solid #e2e8f0' }}>
                                <FieldLabel>Tenure (Joined)</FieldLabel>
                                <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
                                    {store?.joined_at ? new Date(store.joined_at).getFullYear() : '2026'}
                                </div>
                            </div>
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
