import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';
import { PageHeader, StatRow, TablePanel, FieldLabel, A, statusBadge } from '../../lib/adminStyles.jsx';

const API = ADMIN_API_BASE;

const AdminLogistics = () => {
    const [channels, setChannels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
    const [pusatData, setPusatData] = useState(null);
    const [areas, setAreas] = useState([]);
    const [searchingArea, setSearchingArea] = useState(false);

    const loadLogistics = () => {
        setLoading(true);
        fetchJson(`${API}/logistics`)
            .then(d => {
                const data = Array.isArray(d) ? d : (d.data || []);
                setChannels(data);
                setStats({
                    total: data.length,
                    active: data.filter(c => c.is_active).length,
                    inactive: data.filter(c => !c.is_active).length
                });
            })
            .catch(err => console.error("Error loading logistics:", err))
            .finally(() => setLoading(false));
    };

    const loadPusatData = () => {
        fetchJson(`${API}/merchants?search=00000000-0000-0000-0000-000000000000`)
            .then(res => {
                const list = Array.isArray(res) ? res : (res.data || []);
                const pusat = list.find(m => m.id === '00000000-0000-0000-0000-000000000000');
                setPusatData(pusat);
            })
            .catch(console.error);
    };

    const handleSearchArea = async (input) => {
        if (input.length < 3) {
            setAreas([]);
            return;
        }
        setSearchingArea(true);
        try {
            const res = await fetchJson(`/api/shipping/areas?input=${input}`);
            setAreas(res.areas || []);
        } catch (err) {
            console.error(err);
        } finally {
            setSearchingArea(false);
        }
    };

    const updatePusatArea = (area) => {
        if (!window.confirm(`Set origin Gudang Pusat ke ${area.name}?`)) return;
        fetchJson(`${API}/merchants/update`, {
            method: 'PUT',
            body: JSON.stringify({ 
                merchant_id: '00000000-0000-0000-0000-000000000000', 
                biteship_area_id: area.id,
                is_verified: true
            }),
        }).then(() => {
            setAreas([]);
            loadPusatData();
            alert('Origin Gudang Pusat berhasil diperbarui!');
        }).catch(err => alert(err.message));
    };

    const syncLogistics = () => {
        setLoading(true);
        fetchJson(`${API}/logistics/sync`, { method: 'POST' })
            .then(() => {
                loadLogistics();
            })
            .catch(err => alert("Gagal sinkronisasi: " + err.message))
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadLogistics(); loadPusatData(); }, []);

    const toggleChannelStatus = (id, active) => {
        fetchJson(`${API}/logistics/toggle`, {
            method: 'POST',
            body: JSON.stringify({ id, active }),
        }).then(() => loadLogistics())
          .catch(err => alert("Gagal ubah status: " + err.message));
    };

    return (
        <div style={A.page} className="fade-in">
            <PageHeader 
                title="Courier Integration Center" 
                subtitle="Kelola gateway ekspedisi dan partner pengiriman platform AkuGlow secara global."
            >
                <button 
                    style={{ 
                        ...A.btnPrimary, 
                        background: 'linear-gradient(135deg, #6366f1, #4f46e5)', 
                        padding: '12px 24px',
                        border: 'none',
                        boxShadow: '0 10px 15px -3px rgba(99,102,241,0.3)'
                    }} 
                    onClick={syncLogistics} 
                    disabled={loading}
                >
                    <i className={`bx bx-refresh ${loading ? 'bx-spin' : ''}`} style={{ fontSize: 18 }} />
                    <span style={{ marginLeft: 8 }}>Sinkronkan Data Biteship</span>
                </button>
            </PageHeader>

            <StatRow stats={[
                { label: 'Total Couriers', val: stats.total, icon: 'bx-truck', color: '#4f46e5' },
                { label: 'Operational', val: stats.active, icon: 'bx-check-shield', color: '#10b981' },
                { label: 'Disabled', val: stats.inactive, icon: 'bx-block', color: '#ef4444' },
            ]} />

            <TablePanel loading={loading}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24, padding: 24 }}>
                    {channels.length === 0 && !loading ? (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '100px 0', color: '#94a3b8' }}>
                            <i className="bx bx-info-circle" style={{ fontSize: 64, opacity: 0.1, marginBottom: 20 }} />
                            <div style={{ fontSize: 18, fontWeight: 800, color: '#1e293b' }}>Data saluran logistik belum tersedia.</div>
                            <div style={{ fontSize: 14, marginTop: 8 }}>Silakan klik tombol sinkronisasi untuk menarik data dari Biteship.</div>
                        </div>
                    ) : (
                        channels.map(c => (
                            <div key={c.id} style={{ 
                                background: '#fff', 
                                borderRadius: 24, 
                                border: '1px solid #f1f5f9', 
                                padding: 24,
                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 20,
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                position: 'relative'
                            }} className="hover-lift">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <div style={{ 
                                        width: 60, height: 60, borderRadius: 18, 
                                        background: '#f8fafc', border: '1px solid #e2e8f0',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        padding: 12, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                                    }}>
                                        <img 
                                            src={`https://ui-avatars.com/api/?name=${c.code}&background=6366f1&color=fff&bold=true&size=100`}
                                            alt={c.name}
                                            style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 8 }}
                                        />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 16, marginBottom: 2 }}>{c.name}</div>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                            {c.code}
                                        </div>
                                    </div>
                                    
                                    {/* Premium Switch */}
                                    <div style={{ 
                                        padding: '4px', 
                                        background: c.is_active ? '#ecfdf5' : '#f1f5f9', 
                                        borderRadius: 30,
                                        width: 48,
                                        height: 26,
                                        display: 'flex',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        transition: 'all 0.3s ease',
                                        border: c.is_active ? '1px solid #10b981' : '1px solid #e2e8f0'
                                    }} onClick={() => toggleChannelStatus(c.id, !c.is_active)}>
                                        <div style={{ 
                                            width: 18, height: 18, borderRadius: '50%', 
                                            background: c.is_active ? '#10b981' : '#94a3b8',
                                            marginLeft: c.is_active ? 22 : 2,
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                        }} />
                                    </div>
                                </div>

                                <div style={{ 
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    paddingTop: 20, borderTop: '1px solid #f1f5f9'
                                }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em' }}>PLATFORM GOVERNANCE</div>
                                    <div style={{ ...statusBadge(c.is_active ? 'active' : 'suspended'), fontSize: 10, padding: '4px 12px', borderRadius: 8 }}>
                                        {c.is_active ? 'OPERATIONAL' : 'OFFLINE'}
                                    </div>
                                </div>

                                <style>{`
                                    .hover-lift:hover {
                                        transform: translateY(-4px);
                                        box-shadow: 0 12px 20px -5px rgba(0,0,0,0.08);
                                        border-color: #6366f1;
                                    }
                                `}</style>
                            </div>
                        ))
                    )}
                </div>
            </TablePanel>

            {/* Central Warehouse Origin Setup */}
            <div style={{ 
                marginTop: 32, padding: 32, background: '#fff', borderRadius: 28, 
                border: '2px solid #6366f1', boxShadow: '0 10px 25px -5px rgba(99,102,241,0.1)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <div>
                        <h4 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <i className="bx bxs-institution" style={{ color: '#6366f1' }} /> 
                            Central Warehouse Origin (Gudang Pusat)
                        </h4>
                        <p style={{ fontSize: 13, color: '#64748b', marginTop: 4, margin: 0 }}>
                            This area ID serves as the primary shipping point for all platform-owned inventory.
                        </p>
                    </div>
                    {pusatData?.biteship_area_id && (
                        <div style={{ background: '#ecfdf5', color: '#10b981', padding: '8px 16px', borderRadius: 12, fontSize: 12, fontWeight: 800, border: '1px solid #10b981' }}>
                            <i className="bx bxs-check-circle" /> CONFIGURATION ACTIVE
                        </div>
                    )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
                    <div style={{ background: '#f8fafc', padding: 20, borderRadius: 20, border: '1px solid #e2e8f0' }}>
                        <FieldLabel>Search Origin Area (Kecamatan)</FieldLabel>
                        <div style={{ position: 'relative' }}>
                            <input 
                                style={{ ...A.input, padding: '12px 16px', fontSize: 13 }} 
                                placeholder="e.g., Gambir, Jakarta Pusat..." 
                                onChange={e => handleSearchArea(e.target.value)}
                            />
                            {searchingArea && <div style={{ position: 'absolute', right: 12, top: 14, fontSize: 10, color: '#6366f1', fontWeight: 700 }}>Searching...</div>}
                            
                            {areas.length > 0 && (
                                <div style={{ position: 'absolute', zIndex: 100, left: 0, right: 0, top: '100%', marginTop: 8, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: 250, overflowY: 'auto' }}>
                                    {areas.map(a => (
                                        <div key={a.id} onClick={() => updatePusatArea(a)} style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                                            <div style={{ fontWeight: 800, fontSize: 13 }}>{a.name}</div>
                                            <div style={{ color: '#64748b', fontSize: 11 }}>{a.city_name}, {a.province_name}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 12 }}>
                            Note: Origin changes will take effect immediately for all new shipping rate calculations.
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ background: '#f5f7ff', padding: 20, borderRadius: 20, border: '1px solid #dbeafe' }}>
                            <div style={{ fontSize: 10, fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', marginBottom: 8 }}>Current Configuration</div>
                            {pusatData ? (
                                <>
                                    <div style={{ fontSize: 20, fontWeight: 900, color: '#1e293b' }}>{pusatData.biteship_area_id || 'NOT SET'}</div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginTop: 4 }}>
                                        {pusatData.biteship_area_id ? 'Warehouse location is synchronized with Biteship.' : 'Warning: Rates will fail without this ID.'}
                                    </div>
                                </>
                            ) : (
                                <div style={{ fontSize: 13, color: '#94a3b8' }}>Loading warehouse data...</div>
                            )}
                        </div>
                        {pusatData?.biteship_area_id && (
                           <div style={{ padding: '0 10px', fontSize: 12, color: '#64748b' }}>
                               <i className="bx bx-info-circle" /> Area ID for Gudang Pusat is used when a merchant hasn't set their own origin.
                           </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Warning Section */}
            <div style={{ 
                marginTop: 24, padding: 32, background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', borderRadius: 28, 
                border: '1px solid #e2e8f0', display: 'flex', gap: 24, alignItems: 'center',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
                <div style={{ 
                    width: 56, height: 56, borderRadius: 16, background: '#fff', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0'
                }}>
                    <i className="bx bxs-shield-quarter" style={{ color: '#ef4444', fontSize: 28 }} />
                </div>
                <div>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 17, marginBottom: 6 }}>Administrative Notice: Global Logistics Impact</div>
                    <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, maxWidth: 800 }}>
                        Modifikasi pada status saluran logistik di panel ini akan mempengaruhi **seluruh ekosistem AkuGlow**. 
                        Merchant tidak akan dapat memilih kurir yang dinonaktifkan, dan opsi tersebut akan hilang dari halaman checkout pembeli secara instan.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminLogistics;
