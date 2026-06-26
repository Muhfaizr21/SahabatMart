import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson, formatImage, uploadFile } from '../../lib/api';
import { PageHeader, StatRow, TablePanel, FieldLabel, A, statusBadge, Modal } from '../../lib/adminStyles.jsx';
import { AdminInput } from '../../lib/adminComponents.jsx';

import AdminSelect from '../../components/admin/AdminSelect';

const API = ADMIN_API_BASE;

const AdminLogistics = () => {
    const [channels, setChannels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
    const [pusatData, setPusatData] = useState(null);
    const [areas, setAreas] = useState([]);
    const [searchingArea, setSearchingArea] = useState(false);
    
    // Search, Filter, and Selection States
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive
    const [selectedIds, setSelectedIds] = useState([]);

    // Edit Modal States
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingChannel, setEditingChannel] = useState(null);
    const [editFormData, setEditFormData] = useState({ id: 0, name: '', logo_url: '', services: [] });
    const [uploadingLogo, setUploadingLogo] = useState(false);

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadingLogo(true);
        try {
            const resp = await uploadFile(`${API}/upload`, file);
            const url = resp.imageUrl || resp.url || resp.data?.url;
            if (url) {
                setEditFormData(prev => ({ ...prev, logo_url: url }));
            }
        } catch (err) {
            alert('Upload logo gagal: ' + err.message);
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleSaveCourier = (e) => {
        e.preventDefault();
        fetchJson(`${API}/logistics/update`, {
            method: 'PUT',
            body: JSON.stringify({
                id: editFormData.id,
                name: editFormData.name,
                logo_url: editFormData.logo_url,
                services: JSON.stringify(editFormData.services)
            })
        }).then(() => {
            setShowEditModal(false);
            loadLogistics(true); // reload silently
            alert('Kurir berhasil diperbarui!');
        }).catch(err => alert("Gagal memperbarui kurir: " + err.message));
    };

    const loadLogistics = (silent = false) => {
        if (!silent) setLoading(true);
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
            .finally(() => {
                if (!silent) setLoading(false);
            });
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
        } catch (_err) {
            console.error(_err);
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

    useEffect(() => { 
        loadLogistics(); 
        loadPusatData(); 
    }, []);

    const toggleChannelStatus = (id, active) => {
        // Optimistic UI update
        setChannels(prev => prev.map(c => c.id === id ? { ...c, is_active: active } : c));
        setStats(prev => {
            const diff = active ? 1 : -1;
            return {
                ...prev,
                active: prev.active + diff,
                inactive: prev.inactive - diff
            };
        });

        fetchJson(`${API}/logistics/toggle`, {
            method: 'POST',
            body: JSON.stringify({ id, active }),
        }).then(() => {
            loadLogistics(true); // Silent reload to keep fully in sync
        }).catch(err => {
            alert("Gagal ubah status: " + err.message);
            // Revert state
            setChannels(prev => prev.map(c => c.id === id ? { ...c, is_active: !active } : c));
            setStats(prev => {
                const diff = active ? -1 : 1;
                return {
                    ...prev,
                    active: prev.active + diff,
                    inactive: prev.inactive - diff
                };
            });
        });
    };

    // Bulk Toggle Handler
    const handleBulkToggle = (active) => {
        if (selectedIds.length === 0) return;
        const confirmMsg = active 
            ? `Aktifkan ${selectedIds.length} kurir terpilih secara bersamaan?` 
            : `Nonaktifkan ${selectedIds.length} kurir terpilih secara bersamaan?`;
            
        if (!window.confirm(confirmMsg)) return;
        
        // Optimistic UI update
        const backupChannels = [...channels];
        setChannels(prev => prev.map(c => selectedIds.includes(c.id) ? { ...c, is_active: active } : c));
        
        const originalSelection = [...selectedIds];
        setSelectedIds([]); // Clear selection instantly
        
        fetchJson(`${API}/logistics/bulk-toggle`, {
            method: 'POST',
            body: JSON.stringify({ ids: originalSelection, active }),
        }).then(() => {
            loadLogistics(true); // Silent reload
        }).catch(err => {
            alert("Gagal memperbarui status kurir: " + err.message);
            setChannels(backupChannels); // Revert state
            loadLogistics(false); // Trigger full reload on error
        });
    };

    const handleSelectAll = (checked) => {
        if (checked) {
            const visibleIds = filteredChannels.map(c => c.id);
            setSelectedIds(visibleIds);
        } else {
            setSelectedIds([]);
        }
    };

    const toggleSelectId = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    // Filtering logic
    const filteredChannels = channels.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             c.code.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || 
                             (statusFilter === 'active' && c.is_active) || 
                             (statusFilter === 'inactive' && !c.is_active);
        return matchesSearch && matchesStatus;
    });

    const isAllSelected = filteredChannels.length > 0 && filteredChannels.every(c => selectedIds.includes(c.id));

    return (
        <div style={A.page} className="fade-in">
            <PageHeader 
                title="Courier Integration Center" 
                subtitle="Kelola gateway ekspedisi dan partner pengiriman platform AkuGlow secara global."
            >
                <button 
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', 
                        padding: '12px 24px',
                        border: 'none',
                        boxShadow: '0 10px 15px -3px rgba(99,102,241,0.3)' }} 
                    onClick={syncLogistics} 
                    disabled={loading}
                >
                    <i className={`bx bx-refresh ${loading ? 'bx-spin' : ''}`} style={{ fontSize: 18 }} />
                    <span style={{ marginLeft: 8 }}>Sinkronkan Data Biteship</span>
                </button>
            </PageHeader>

            <StatRow stats={[
                { label: 'Total Kurir', val: stats.total, icon: 'bx-truck', color: '#4f46e5' },
                { label: 'Aktif / Operasional', val: stats.active, icon: 'bx-check-shield', color: '#10b981' },
                { label: 'Non-aktif / Offline', val: stats.inactive, icon: 'bx-block', color: '#ef4444' },
            ]} />

            {/* Filter and Bulk Action Card */}
            <div style={{
                background: '#fff',
                borderRadius: 20,
                border: '1px solid #f1f5f9',
                padding: '20px 24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: 16
            }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
                    {/* Search & Filter Inputs */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', flex: 1 }}>
                        <div style={{ ...A.searchWrap, minWidth: 260, flex: 1, maxWidth: 400 }}>
                            <i className="bx bx-search" style={A.searchIcon} />
                            <input
                                className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:border-indigo-400 transition-all w-full" style={{ width: '100%', paddingLeft: 40, height: 42 }}
                                placeholder="Cari nama kurir atau kode (JNE, SiCepat)..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <AdminSelect 
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400" style={{ height: 42, padding: '0 16px', minWidth: 160 }}
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                        >
                            <option value="all">Semua Status</option>
                            <option value="active">Aktif / Operasional</option>
                            <option value="inactive">Non-aktif / Offline</option>
                        </AdminSelect>
                    </div>
                </div>

                {/* Floating/Contextual Bulk Action Bar */}
                {selectedIds.length > 0 && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'linear-gradient(135deg, #f5f7ff, #eef2ff)',
                        border: '1px solid #dbeafe',
                        padding: '16px 24px',
                        borderRadius: 16,
                        animation: 'slideDown 0.25s ease-out'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ 
                                background: '#6366f1', color: '#fff', 
                                width: 28, height: 28, borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 800, fontSize: 13
                            }}>
                                {selectedIds.length}
                            </div>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#312e81' }}>Kurir terpilih untuk aksi massal</span>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button 
                                onClick={() => handleBulkToggle(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm" style={{ background: 'linear-gradient(135deg, #10b981, #059669)',
                                    boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }}
                            >
                                <i className="bx bx-check-circle" style={{ fontSize: 16 }} />
                                Aktifkan Bersamaan
                            </button>
                            <button 
                                onClick={() => handleBulkToggle(false)}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                    boxShadow: '0 4px 12px rgba(239,68,68,0.2)' }}
                            >
                                <i className="bx bx-x-circle" style={{ fontSize: 16 }} />
                                Nonaktifkan Bersamaan
                            </button>
                            <button 
                                onClick={() => setSelectedIds([])}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm"
                            >
                                Batal
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Courier Table View */}
            <TablePanel loading={loading}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 650 }}>
                        <thead>
                            <tr>
                                <th style={{ ...A.th, width: 50, textAlign: 'center', padding: '16px 12px' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={isAllSelected}
                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                        style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#6366f1' }}
                                    />
                                </th>
                                <th style={{ ...A.th, width: 80 }}>Logo</th>
                                <th style={A.th}>Nama Partner Kurir</th>
                                <th style={A.th}>Kode Sistem</th>
                                <th style={A.th}>Platform Governance</th>
                                <th style={{ ...A.th, width: 140, textAlign: 'center' }}>Aksi / Toggle</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredChannels.length === 0 && !loading ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '80px 20px', color: '#94a3b8' }}>
                                        <i className="bx bx-info-circle" style={{ fontSize: 48, opacity: 0.2, marginBottom: 12 }} />
                                        <div style={{ fontSize: 16, fontWeight: 800, color: '#1e293b' }}>Kurir tidak ditemukan.</div>
                                        <div style={{ fontSize: 13, marginTop: 4 }}>Coba sesuaikan kata kunci pencarian atau filter status Anda.</div>
                                    </td>
                                </tr>
                            ) : (
                                filteredChannels.map(c => {
                                    const isSelected = selectedIds.includes(c.id);
                                    return (
                                        <tr 
                                            key={c.id} 
                                            style={{ 
                                                background: isSelected ? '#f5f7ff' : '#fff', 
                                                borderBottom: '1px solid #f1f5f9', 
                                                transition: 'background 0.2s',
                                                cursor: 'pointer'
                                            }}
                                            onClick={(e) => {
                                                if (e.target.tagName !== 'INPUT' && !e.target.closest('.switch-container')) {
                                                    toggleSelectId(c.id);
                                                }
                                            }}
                                            className="table-row-hover"
                                        >
                                            {/* Checkbox Column */}
                                            <td style={{ ...A.td, textAlign: 'center', padding: '12px' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={isSelected}
                                                    onChange={() => toggleSelectId(c.id)}
                                                    style={{ 
                                                        width: 17, 
                                                        height: 17, 
                                                        cursor: 'pointer', 
                                                        accentColor: '#6366f1' 
                                                    }}
                                                />
                                            </td>

                                             {/* Logo Column */}
                                             <td style={A.td}>
                                                 <div style={{ 
                                                     width: 44, height: 44, borderRadius: 12, 
                                                     background: '#f8fafc', border: '1px solid #e2e8f0',
                                                     display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                     padding: 8, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                                                 }}>
                                                     <img 
                                                         src={c.logo_url ? formatImage(c.logo_url) : `https://ui-avatars.com/api/?name=${c.code}&background=6366f1&color=fff&bold=true&size=100`}
                                                         alt={c.name}
                                                         style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 6 }}
                                                     />
                                                 </div>
                                             </td>

                                            {/* Name Column */}
                                            <td style={{ ...A.td, fontWeight: 700, color: '#0f172a', fontSize: 14 }}>
                                                {c.name}
                                            </td>

                                            {/* Code Column */}
                                            <td style={{ ...A.td, fontFamily: 'monospace', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', fontSize: 13 }}>
                                                {c.code}
                                            </td>

                                            {/* Governance / Badge Column */}
                                            <td style={A.td}>
                                                <div style={{ ...statusBadge(c.is_active ? 'active' : 'suspended'), fontSize: 10, padding: '4px 12px', borderRadius: 8 }}>
                                                    {c.is_active ? 'OPERATIONAL' : 'OFFLINE'}
                                                </div>
                                            </td>

                                             {/* Actions Switch Column */}
                                             <td style={{ ...A.td, textAlign: 'center' }}>
                                                 <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                                                     <button
                                                         onClick={(e) => {
                                                             e.stopPropagation();
                                                             setEditingChannel(c);
                                                             let parsedServices = [];
                                                             try {
                                                                 parsedServices = c.services ? JSON.parse(c.services) : [];
                                                             } catch(err) {
                                                                 console.error(err);
                                                             }
                                                             setEditFormData({ 
                                                                 id: c.id, 
                                                                 name: c.name, 
                                                                 logo_url: c.logo_url || '',
                                                                 services: parsedServices
                                                             });
                                                             setShowEditModal(true);
                                                         }}
                                                         className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm" style={{ padding: '4px 8px',
                                                             borderRadius: 8,
                                                             display: 'flex',
                                                             alignItems: 'center',
                                                             gap: 4,
                                                             fontSize: 12,
                                                             border: '1px solid #e2e8f0',
                                                             cursor: 'pointer' }}
                                                     >
                                                         <i className="bx bx-edit-alt" style={{ fontSize: 14 }} />
                                                         Edit
                                                     </button>
                                                     <div 
                                                         className="switch-container"
                                                         style={{ 
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
                                                             border: c.is_active ? '1px solid #10b981' : '1px solid #e2e8f0',
                                                         }} 
                                                         onClick={(e) => {
                                                             e.stopPropagation();
                                                             toggleChannelStatus(c.id, !c.is_active);
                                                         }}
                                                     >
                                                         <div style={{ 
                                                             width: 18, height: 18, borderRadius: '50%', 
                                                             background: c.is_active ? '#10b981' : '#94a3b8',
                                                             marginLeft: c.is_active ? 22 : 2,
                                                             transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                             boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                         }} />
                                                     </div>
                                                 </div>
                                             </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
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
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400" style={{ padding: '12px 16px', fontSize: 13 }} 
                                placeholder="e.g., Gambir, Jakarta Pusat..." 
                                onChange={e => handleSearchArea(e.target.value)}
                            />
                            {searchingArea && <div style={{ position: 'absolute', right: 12, top: 14, fontSize: 10, color: '#6366f1', fontWeight: 700 }}>Searching...</div>}
                            
                            {areas.length > 0 && (
                                <div style={{ position: 'absolute', zIndex: 100, left: 0, right: 0, top: '100%', marginTop: 8, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: 250, overflowY: 'auto' }}>
                                    {areas.map(a => (
                                        <div key={a.id} onClick={() => updatePusatArea(a)} style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                                            <div style={{ fontWeight: 800, fontSize: 13 }}>{a.name}</div>
                                            <div style={{ color: '#64748b', fontSize: 11 }}>
                                                {a.administrative_division_level_2_name || a.city_name || ''}, {a.administrative_division_level_1_name || a.province_name || ''} ({a.postal_code || '-'})
                                            </div>
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

            {/* Edit Courier Modal */}
            {showEditModal && (
                <Modal title={`Edit Kurir: ${editingChannel?.code?.toUpperCase()}`} onClose={() => setShowEditModal(false)}>
                    <form onSubmit={handleSaveCourier} style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '10px 0' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <FieldLabel>Nama Partner Kurir</FieldLabel>
                            <AdminInput
                                value={editFormData.name}
                                onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                                required
                                placeholder="e.g. JNE Express"
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <FieldLabel>Logo Kurir</FieldLabel>
                            <div style={{ 
                                height: 140, borderRadius: 16, border: '2px dashed #cbd5e1', 
                                background: '#f8fafc', display: 'flex', alignItems: 'center', 
                                justifyContent: 'center', position: 'relative', overflow: 'hidden' 
                            }}>
                                {editFormData.logo_url ? (
                                    <>
                                        <img src={formatImage(editFormData.logo_url)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Logo Preview" />
                                        <button 
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditFormData({ ...editFormData, logo_url: '' });
                                            }}
                                            style={{
                                                position: 'absolute', top: 8, right: 8,
                                                background: '#ef4444', color: '#fff', border: 'none',
                                                borderRadius: 8, padding: '4px 8px', fontSize: 11,
                                                cursor: 'pointer', fontWeight: 700
                                            }}
                                        >
                                            Hapus Logo
                                        </button>
                                    </>
                                ) : (
                                    <div style={{ textAlign: 'center', color: '#64748b' }}>
                                        <i className="bx bx-image-add" style={{ fontSize: 32, color: '#94a3b8' }} />
                                        <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4 }}>PILIH FILE UNTUK UPLOAD</div>
                                        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Format: PNG, JPG, JPEG</div>
                                    </div>
                                )}
                                <input 
                                    type="file" 
                                    onChange={handleLogoUpload} 
                                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} 
                                    accept="image/*" 
                                    disabled={uploadingLogo}
                                />
                                {uploadingLogo && (
                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <div className="spinner-border text-primary" style={{ width: 24, height: 24 }} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Services List (Isi-isi Kurir) */}
                        {editFormData.services && editFormData.services.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <FieldLabel>Layanan Ekspedisi (Isi-isi Kurir)</FieldLabel>
                                <div style={{ 
                                    maxHeight: 180, overflowY: 'auto', border: '1px solid #e2e8f0', 
                                    borderRadius: 16, padding: '12px 16px', background: '#f8fafc',
                                    display: 'flex', flexDirection: 'column', gap: 12
                                }}>
                                    {editFormData.services.map((svc, idx) => (
                                        <div key={svc.code} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', textTransform: 'uppercase' }}>
                                                    {svc.name}
                                                </span>
                                                <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#6366f1', textTransform: 'uppercase' }}>
                                                    {svc.code}
                                                </span>
                                            </div>
                                            <div 
                                                style={{ 
                                                    padding: '3px', 
                                                    background: svc.is_active ? '#ecfdf5' : '#f1f5f9', 
                                                    borderRadius: 24,
                                                    width: 44,
                                                    height: 24,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    cursor: 'pointer',
                                                    position: 'relative',
                                                    transition: 'all 0.3s ease',
                                                    border: svc.is_active ? '1px solid #10b981' : '1px solid #e2e8f0',
                                                }}
                                                onClick={() => {
                                                    const updated = [...editFormData.services];
                                                    updated[idx] = { ...updated[idx], is_active: !svc.is_active };
                                                    setEditFormData({ ...editFormData, services: updated });
                                                }}
                                            >
                                                <div style={{ 
                                                    width: 16, height: 16, borderRadius: '50%', 
                                                    background: svc.is_active ? '#10b981' : '#94a3b8',
                                                    marginLeft: svc.is_active ? 20 : 2,
                                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                                }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 10 }}>
                            <button type="button" onClick={() => setShowEditModal(false)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm">
                                Batal
                            </button>
                            <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
                                Simpan Perubahan
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Custom Animation and Interactions Style */}
            <style>{`
                .table-row-hover:hover {
                    background: #f8fafc !important;
                }
                @keyframes slideDown {
                    from { transform: translateY(-10px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default AdminLogistics;


