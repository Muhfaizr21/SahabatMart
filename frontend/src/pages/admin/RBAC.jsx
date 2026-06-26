import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';
import { A, PageHeader, TablePanel, Modal, FieldLabel, StatRow, roleBadge } from '../../lib/adminStyles.jsx';
import toast from 'react-hot-toast';

import AdminSelect from '../../components/admin/AdminSelect';

// Helper for formatting
const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

const AdminRBAC = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [admins, setAdmins] = useState([]);
    const [stats, setStats] = useState({ total_roles: 0, active_admins: 0, total_perms: 0, recent_logins: 0, dept_stats: [], role_stats: [] });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const [showRoleModal, setShowRoleModal] = useState(false);
    const [showUserModal, setShowUserModal] = useState(false);
    const [previewUser, setPreviewUser] = useState(null);
    const [selectedRole, setSelectedRole] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [expandedGroups, setExpandedGroups] = useState({});
    
    const initialUserState = { email: '', password: '', full_name: '', role: 'admin', admin_role: '', department: '' };
    const [newUser, setNewUser] = useState(initialUserState);

    const toggleGroupExpand = (groupName) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupName]: !prev[groupName]
        }));
    };

    const loadData = () => {
        setLoading(true);
        Promise.all([
            fetchJson(`${ADMIN_API_BASE}/rbac/roles`),
            fetchJson(`${ADMIN_API_BASE}/rbac/permissions`),
            fetchJson(`${ADMIN_API_BASE}/rbac/stats`)
        ]).then(([r, p, s]) => {
            setRoles(r || []);
            setPermissions(p || []);
            setStats(s || { total_roles: 0, active_admins: 0, total_perms: 0, recent_logins: 0, dept_stats: [], role_stats: [] });
            loadAdmins();
        }).catch(err => {
            toast.error("Gagal memuat data RBAC");
            setLoading(false);
        });
    };

    const loadAdmins = () => {
        let url = `${ADMIN_API_BASE}/rbac/admins?`;
        if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}&`;
        if (departmentFilter) url += `department=${encodeURIComponent(departmentFilter)}&`;
        if (statusFilter) url += `status=${encodeURIComponent(statusFilter)}&`;
        
        fetchJson(url).then(data => {
            setAdmins(data || []);
            setLoading(false);
        }).catch(err => {
            toast.error("Gagal memuat data admin");
            setLoading(false);
        });
    };

    useEffect(() => { loadData(); }, []);
    
    // Re-load admins when filters change
    useEffect(() => {
        if (!loading) loadAdmins();
    }, [searchTerm, departmentFilter, statusFilter]);

    const handleSaveRole = (e) => {
        e.preventDefault();
        fetchJson(`${ADMIN_API_BASE}/rbac/roles/upsert`, {
            method: 'POST',
            body: JSON.stringify(selectedRole)
        }).then(() => {
            toast.success('Security Profile berhasil disinkronisasi');
            setShowRoleModal(false);
            loadData();
        }).catch(err => toast.error(err.message));
    };

    const handleDeleteRole = (id) => {
        if (!window.confirm("Apakah Anda yakin ingin menghapus role ini?")) return;
        fetchJson(`${ADMIN_API_BASE}/rbac/roles/delete?id=${id}`, { method: 'DELETE' })
            .then(() => {
                toast.success("Role berhasil dihapus");
                loadData();
            }).catch(err => toast.error(err.message));
    };

    const handleCloneRole = (role) => {
        setSelectedRole({
            ...role,
            id: '',
            name: `${role.name} (Copy)`,
            permission_ids: (role.permissions || []).map(p => p.id)
        });
        setShowRoleModal(true);
    };

    const handleSaveUser = (e) => {
        e.preventDefault();
        const url = selectedUser ? `${ADMIN_API_BASE}/rbac/users/update` : `${ADMIN_API_BASE}/rbac/users`;
        const payload = selectedUser ? {
            id: selectedUser.id,
            full_name: newUser.full_name,
            admin_role: newUser.admin_role,
            department: newUser.department,
            role: newUser.role
        } : newUser;

        const method = selectedUser ? 'PUT' : 'POST';

        fetchJson(url, {
            method: method,
            body: JSON.stringify(payload)
        }).then(() => {
            toast.success(selectedUser ? 'Data admin berhasil diperbarui' : 'Admin baru berhasil didaftarkan');
            setShowUserModal(false);
            setNewUser(initialUserState);
            setSelectedUser(null);
            loadData();
        }).catch(err => toast.error(err.message));
    };

    const handleEditUser = (user) => {
        setSelectedUser(user);
        setNewUser({
            email: user.email,
            password: '', // Leave blank for edit
            full_name: user.profile?.full_name || '',
            role: user.role,
            admin_role: user.admin_role || '',
            department: user.department || ''
        });
        setShowUserModal(true);
    };

    const handleToggleStatus = (id, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        fetchJson(`${ADMIN_API_BASE}/rbac/users/status`, {
            method: 'POST',
            body: JSON.stringify({ id, status: newStatus })
        }).then(() => {
            toast.success(`Status admin diubah menjadi ${newStatus}`);
            loadData();
        }).catch(err => toast.error(err.message));
    };

    const handleDeleteUser = (id) => {
        if (!window.confirm("Apakah Anda yakin ingin menghapus admin ini secara permanen?")) return;
        fetchJson(`${ADMIN_API_BASE}/rbac/users/delete?id=${id}`, { method: 'DELETE' })
            .then(() => {
                toast.success("Admin berhasil dihapus");
                loadData();
            }).catch(err => toast.error(err.message));
    };

    const toggleGroup = (groupName, select) => {
        const groupPerms = permissions.filter(p => p.group === groupName).map(p => p.id);
        let newIds = [...(selectedRole.permission_ids || [])];
        if (select) {
            newIds = [...new Set([...newIds, ...groupPerms])];
        } else {
            newIds = newIds.filter(id => !groupPerms.includes(id));
        }
        setSelectedRole({ ...selectedRole, permission_ids: newIds });
    };

    const togglePermission = (permId) => {
        const currentIds = selectedRole.permission_ids || [];
        setSelectedRole({
            ...selectedRole,
            permission_ids: currentIds.includes(permId) 
                ? currentIds.filter(id => id !== permId) 
                : [...currentIds, permId]
        });
    };

    const getAdminPermissions = (adminRoleName) => {
        if (adminRoleName === 'superadmin') return permissions; // Superadmin has all
        const role = roles.find(r => r.name === adminRoleName);
        return role ? role.permissions : [];
    };

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 60 }}>
            <style>{`
                .rbac-grid-main { display: grid; grid-template-columns: 1.5fr 1fr; gap: 24px; }
                .rbac-perm-cols { column-count: 2; column-gap: 24px; }
                .rbac-role-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; }
                .rbac-modal-grid { display: grid; grid-template-columns: 280px 1fr; gap: 32px; }
                .rbac-user-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 32px; }
                .rbac-hero-content { display: flex; justify-content: space-between; align-items: center; }
                .rbac-toolbar { display: flex; gap: 12px; align-items: center; width: 100%; }
                .rbac-tab-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; gap: 16px; }
                .rbac-card-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; gap: 12px; }

                @media (max-width: 1024px) {
                    .rbac-grid-main { grid-template-columns: 1fr; }
                    .rbac-perm-cols { column-count: 1; }
                    .rbac-modal-grid { grid-template-columns: 1fr; }
                    .rbac-user-grid { grid-template-columns: 1fr; gap: 40px; }
                    .rbac-toolbar { flex-wrap: wrap; }
                }

                @media (max-width: 768px) {
                    .rbac-hero-content { flex-direction: column; align-items: flex-start; gap: 24px; }
                    .rbac-toolbar > * { flex: 1 1 auto; min-width: 150px; }
                    .rbac-table-hide { display: none; }
                    .rbac-tab-header { flex-direction: column; align-items: stretch; text-align: left; }
                    .rbac-tab-header button { width: 100%; justify-content: flex-start; }
                    .rbac-card-head { flex-direction: column; align-items: flex-start; gap: 16px; }
                    .admin-tab-group { width: 100%; overflow-x: auto; padding-bottom: 10px; display: flex !important; }
                }

                @media (max-width: 640px) {
                    .rbac-role-grid { grid-template-columns: 1fr; }
                    .admin-header-stack { flex-direction: column; align-items: flex-start !important; gap: 20px !important; }
                }
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>

            <PageHeader title="IDENTITY & ACCESS MANAGEMENT" subtitle="Kontrol granular otoritas sistem dan manajemen staf tingkat enterprise">
                <div className="admin-tab-group" style={{ display: 'flex', gap: 6 }}>
                    {['dashboard', 'personnel', 'roles', 'permissions'].map(t => (
                        <button key={t} style={A.tab(activeTab === t)} onClick={() => setActiveTab(t)}>
                            {t === 'dashboard' && <i className="bx bx-pie-chart-alt-2" style={{marginRight: 6}}/>}
                            {t === 'personnel' && <i className="bx bx-group" style={{marginRight: 6}}/>}
                            {t === 'roles' && <i className="bx bx-shield-quarter" style={{marginRight: 6}}/>}
                            {t === 'permissions' && <i className="bx bx-key" style={{marginRight: 6}}/>}
                            {t.toUpperCase()}
                        </button>
                    ))}
                </div>
            </PageHeader>

            {/* --- DASHBOARD TAB --- */}
            {activeTab === 'dashboard' && (
                <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: 24 }}>
                    
                    {/* HERO COMMAND CENTER */}
                    <div style={{ 
                        background: 'linear-gradient(135deg, #1e1b4b, #312e81)', 
                        borderRadius: 32, 
                        padding: '40px', 
                        color: '#fff', 
                        position: 'relative', 
                        overflow: 'hidden',
                        boxShadow: '0 20px 50px rgba(49,46,129,0.3)'
                    }}>
                        <div style={{ position: 'absolute', right: -50, top: -50, width: 300, height: 300, background: 'rgba(99,102,241,0.1)', borderRadius: '50%', blur: '50px' }} />
                        <div className="rbac-hero-content" style={{ position: 'relative', zIndex: 1 }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                    <div style={{ padding: '6px 12px', background: 'rgba(16,185,129,0.2)', borderRadius: 20, color: '#10b981', fontSize: 11, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />
                                        SYSTEM LIVE & SECURE
                                    </div>
                                    <span style={{ fontSize: 13, color: '#94a3b8' }}>Last audit: Just now</span>
                                </div>
                                <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900, letterSpacing: '-1px' }}>RBAC Command Center</h1>
                                <p style={{ margin: '8px 0 0 0', fontSize: 15, color: '#a5b4fc', maxWidth: 500, lineHeight: 1.6 }}>
                                    Pusat kendali otoritas sistem AkuGlow. Pantau, kelola, dan audit seluruh akses personel secara real-time.
                                </p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>Security Health</div>
                                <div style={{ fontSize: 48, fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'baseline', gap: 4 }}>
                                    98<span style={{ fontSize: 20, color: '#6366f1' }}>%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <StatRow stats={[
                        { label: 'Security Profiles', val: stats.total_roles, icon: 'bx-shield-quarter', color: '#6366f1' },
                        { label: 'Active Personnel', val: stats.active_admins, icon: 'bx-user-check', color: '#10b981' },
                        { label: 'Capabilities', val: stats.total_perms, icon: 'bx-key', color: '#f59e0b' },
                        { label: 'Recent Access', val: stats.recent_logins, icon: 'bx-history', color: '#8b5cf6' }
                    ]} />

                    <div className="rbac-grid-main">
                        {/* DISTRIBUTION CHARTS */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm" style={{ padding: 30 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
                                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <i className="bx bx-buildings" style={{ color: '#6366f1', fontSize: 22 }} /> Personnel Allocation by Department
                                    </h3>
                                    <button style={{ ...A.iconBtn('#94a3b8', 'transparent') }}><i className="bx bx-dots-horizontal-rounded" /></button>
                                </div>
                                {stats.dept_stats?.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                        {stats.dept_stats.map(ds => (
                                            <div key={ds.department || 'Unassigned'} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                                <div style={{ width: 140, fontSize: 13, fontWeight: 800, color: '#475569' }}>{ds.department || 'Unassigned'}</div>
                                                <div style={{ flex: 1, height: 10, background: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
                                                    <div style={{ width: `${(ds.count / Math.max(1, stats.active_admins + stats.inactive_admins)) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #818cf8)', borderRadius: 5 }} />
                                                </div>
                                                <div style={{ width: 40, textAlign: 'right', fontSize: 13, fontWeight: 900, color: '#1e293b' }}>{ds.count}</div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Data tidak tersedia</div>
                                )}
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm" style={{ padding: 30 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
                                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <i className="bx bx-shield-alt-2" style={{ color: '#10b981', fontSize: 22 }} /> Security Profile Distribution
                                    </h3>
                                    <button style={{ ...A.iconBtn('#94a3b8', 'transparent') }}><i className="bx bx-dots-horizontal-rounded" /></button>
                                </div>
                                {stats.role_stats?.length > 0 ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                                        {stats.role_stats.map(rs => (
                                            <div key={rs.admin_role || 'No Role'} style={{ padding: 20, background: '#f8fafc', borderRadius: 20, border: '1px solid #f1f5f9' }}>
                                                <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>{rs.admin_role || 'Unassigned'}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <div style={{ fontSize: 24, fontWeight: 900, color: '#1e293b' }}>{rs.count}</div>
                                                    <div style={{ width: 32, height: 32, borderRadius: 10, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                                        <i className="bx bx-user" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Data tidak tersedia</div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT SIDE: RECENT ACTIVITY & QUICK ACTIONS */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm" style={{ padding: 30, background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
                                <h3 style={{ margin: '0 0 20px 0', fontSize: 15, fontWeight: 900, color: '#1e293b' }}>SECURITY QUICK ACTIONS</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                                    <button onClick={()=>toast.success('System Scan Initiated')} style={{ padding: '14px 20px', borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: '0.2s' }} onMouseEnter={e=>e.currentTarget.style.borderColor='#6366f1'}>
                                        <i className="bx bx-scan" style={{ fontSize: 20, color: '#6366f1' }} />
                                        <div style={{ textAlign: 'left' }}>
                                            <div style={{ fontSize: 13, fontWeight: 800 }}>Initiate System Scan</div>
                                            <div style={{ fontSize: 11, color: '#94a3b8' }}>Check for access anomalies</div>
                                        </div>
                                    </button>
                                    <button onClick={()=>toast.success('Security Log Exported')} style={{ padding: '14px 20px', borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: '0.2s' }} onMouseEnter={e=>e.currentTarget.style.borderColor='#6366f1'}>
                                        <i className="bx bx-download" style={{ fontSize: 20, color: '#10b981' }} />
                                        <div style={{ textAlign: 'left' }}>
                                            <div style={{ fontSize: 13, fontWeight: 800 }}>Export Audit Logs</div>
                                            <div style={{ fontSize: 11, color: '#94a3b8' }}>Download PDF/CSV reports</div>
                                        </div>
                                    </button>
                                    <button onClick={()=>setActiveTab('personnel')} style={{ padding: '14px 20px', borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: '0.2s' }} onMouseEnter={e=>e.currentTarget.style.borderColor='#6366f1'}>
                                        <i className="bx bx-user-plus" style={{ fontSize: 20, color: '#f59e0b' }} />
                                        <div style={{ textAlign: 'left' }}>
                                            <div style={{ fontSize: 13, fontWeight: 800 }}>Onboard New Staff</div>
                                            <div style={{ fontSize: 11, color: '#94a3b8' }}>Grant access to new personnel</div>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm" style={{ padding: 30 }}>
                                <h3 style={{ margin: '0 0 20px 0', fontSize: 15, fontWeight: 900, color: '#1e293b' }}>PLATFORM ADVISORY</h3>
                                <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: 20, borderRadius: 20 }}>
                                    <div style={{ display: 'flex', gap: 14 }}>
                                        <i className="bx bx-info-circle" style={{ fontSize: 24, color: '#d97706' }} />
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 900, color: '#92400e' }}>Multi-Factor Authentication</div>
                                            <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#b45309', lineHeight: 1.5 }}>
                                                Disarankan untuk mewajibkan MFA bagi seluruh pengguna dengan role **Superadmin** untuk keamanan maksimal.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <style>{`
                        @keyframes pulse {
                            0% { transform: scale(1); opacity: 1; }
                            50% { transform: scale(2); opacity: 0.5; }
                            100% { transform: scale(1); opacity: 1; }
                        }
                    `}</style>
                </div>
            )}
            {/* --- PERSONNEL TAB --- */}
            {activeTab === 'personnel' && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    <TablePanel 
                        loading={loading}
                        toolbar={(
                            <div className="rbac-toolbar">
                                <div style={{ ...A.searchWrap, flex: 1 }}>
                                    <i className="bx bx-search" style={A.searchIcon} />
                                    <input 
                                        className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:border-indigo-400 transition-all w-full" style={{ width: '100%' }} 
                                        placeholder="Cari berdasarkan nama atau email..." 
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <AdminSelect className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400" value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)}>
                                    <option value="">Semua Departemen</option>
                                    <option value="IT & SYSTEMS">IT & SYSTEMS</option>
                                    <option value="MARKETING">MARKETING</option>
                                    <option value="FINANCE">FINANCE</option>
                                    <option value="CUSTOMER SERVICE">CUSTOMER SERVICE</option>
                                    <option value="LOGISTICS">LOGISTICS</option>
                                </AdminSelect>
                                <AdminSelect className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                                    <option value="">Semua Status</option>
                                    <option value="active">Active</option>
                                    <option value="suspended">Suspended</option>
                                </AdminSelect>
                                <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm" onClick={() => { setSelectedUser(null); setNewUser(initialUserState); setShowUserModal(true); }}>
                                    <i className="bx bx-user-plus" /> Onboard Staff
                                </button>
                            </div>
                        )}
                    >
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={{ ...A.th, paddingLeft: 24 }}>Personnel Details</th>
                                    <th style={A.th} className="rbac-table-hide">Department</th>
                                    <th style={A.th} className="rbac-table-hide">Security Profile</th>
                                    <th style={A.th}>Access Level</th>
                                    <th style={A.th} className="rbac-table-hide">Status & Activity</th>
                                    <th style={{ ...A.th, textAlign: 'right', paddingRight: 24 }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {admins.map(user => (
                                    <tr key={user.id} style={{ ...A.tr }}>
                                        <td style={{ ...A.td, paddingLeft: 24 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                                <div style={{ 
                                                    width: 40, height: 40, borderRadius: 12, 
                                                    background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)', 
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                                    color: '#475569', fontSize: 16, fontWeight: 900,
                                                    boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.8)'
                                                }}>
                                                    {(user.profile?.full_name || 'U')[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 800, color: '#1e293b', fontSize: 13.5 }}>{user.profile?.full_name}</div>
                                                    <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 1, fontFamily: 'monospace' }}>{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={A.td} className="rbac-table-hide">
                                            <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', background: '#f1f5f9', padding: '4px 10px', borderRadius: 8 }}>
                                                {user.department || 'Unassigned'}
                                            </span>
                                        </td>
                                        <td style={A.td} className="rbac-table-hide">
                                            <div style={{ fontSize: 13, color: '#6366f1', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                {user.role === 'superadmin' ? (
                                                    <span style={{ color: '#94a3b8', fontWeight: 600, fontSize: 11, letterSpacing: '0.05em' }}>SYSTEM CONTROL ACCESS</span>
                                                ) : (
                                                    <>
                                                        <i className="bx bx-shield-quarter" />
                                                        {user.admin_role || 'No Profile Assigned'}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td style={A.td}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={roleBadge(user.role)}>
                                                    {user.role}
                                                </span>
                                                <button 
                                                    style={A.iconBtn('#94a3b8', '#f8fafc')}
                                                    onMouseEnter={e => { e.currentTarget.style.color = '#6366f1'; e.currentTarget.style.background = '#eef2ff'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = '#f8fafc'; }}
                                                    onClick={() => setPreviewUser(user)}
                                                    title="View Permissions"
                                                >
                                                    <i className="bx bx-key" />
                                                </button>
                                            </div>
                                        </td>
                                        <td style={A.td} className="rbac-table-hide">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                                <div style={{ width: 7, height: 7, borderRadius: '50%', background: user.status === 'active' ? '#10b981' : '#f43f5e' }} />
                                                <span style={{ fontSize: 11, fontWeight: 800, color: user.status === 'active' ? '#10b981' : '#f43f5e', textTransform: 'uppercase' }}>
                                                    {user.status}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: 10.5, color: '#94a3b8' }}>Last Login: {formatDate(user.last_login_at)}</div>
                                        </td>
                                        <td style={{ ...A.td, textAlign: 'right', paddingRight: 24 }}>
                                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                <button style={A.iconBtn('#6366f1')} onClick={() => handleEditUser(user)} title="Edit Profile">
                                                    <i className="bx bx-edit-alt" />
                                                </button>
                                                <button style={A.iconBtn(user.status === 'active' ? '#f59e0b' : '#10b981', user.status === 'active' ? '#fff7ed' : '#f0fdf4')} onClick={() => handleToggleStatus(user.id, user.status)} title={user.status === 'active' ? 'Suspend' : 'Activate'}>
                                                    <i className={`bx ${user.status === 'active' ? 'bx-block' : 'bx-check-circle'}`} />
                                                </button>
                                                <button style={A.iconBtn('#ef4444', '#fef2f2')} onClick={() => handleDeleteUser(user.id)} title="Delete Staff">
                                                    <i className="bx bx-trash" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {admins.length === 0 && (
                                    <tr>
                                        <td colSpan="6" style={{ padding: 60, textAlign: 'center' }}>
                                            <i className="bx bx-user-x" style={{ fontSize: 54, marginBottom: 16, color: '#e2e8f0' }} />
                                            <div style={{ fontSize: 15, fontWeight: 700, color: '#94a3b8' }}>Tidak ada personel yang ditemukan</div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </TablePanel>

                </div>
            )}

            {/* --- ROLES TAB --- */}
            {activeTab === 'roles' && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    <div className="rbac-tab-header">
                        <div style={{ fontSize: 14, color: '#64748b', fontWeight: 600 }}>
                            Manage security profiles and their associated capability matrices.
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm" onClick={() => { setSelectedRole({ name: '', description: '', permission_ids: [] }); setShowRoleModal(true); }}>
                            <i className="bx bx-plus-circle" /> Create Security Profile
                        </button>
                    </div>
                    <div className="rbac-role-grid">
                        {roles.map(role => (
                            <div key={role.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm" style={{ borderTop: '4px solid #6366f1', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s', cursor: 'default' }} 
                                 onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                                 onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                                <div style={{ padding: 24, flex: 1 }}>
                                    <div className="rbac-card-head">
                                        <div style={{ minWidth: 0 }}>
                                            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#1e293b', letterSpacing: '-0.3px' }}>{role.name}</h3>
                                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, fontWeight: 700, textTransform: 'uppercase' }}>UUID: {role.id.split('-')[0]}...</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button style={A.iconBtn('#10b981', '#f0fdf4')} onClick={() => handleCloneRole(role)} title="Clone Profile"><i className="bx bx-copy" /></button>
                                            <button style={A.iconBtn('#6366f1', '#eef2ff')} onClick={() => { setSelectedRole({...role, permission_ids: role.permissions.map(p=>p.id)}); setShowRoleModal(true); }}><i className="bx bx-edit-alt" /></button>
                                            <button style={A.iconBtn('#ef4444', '#fef2f2')} onClick={() => handleDeleteRole(role.id)} title="Delete Profile"><i className="bx bx-trash" /></button>
                                        </div>
                                    </div>
                                    <p style={{ margin: '0 0 20px 0', fontSize: 13, color: '#64748b', lineHeight: 1.6, minHeight: 40 }}>{role.description || 'No description provided for this profile.'}</p>
                                    
                                    <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #f1f5f9' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                            <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Capabilities</span>
                                            <span style={{ background: '#6366f1', color: '#fff', padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 800 }}>{role.permissions?.length || 0}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {role.permissions?.slice(0, 6).map(p => (
                                                <span key={p.id} style={{ background: '#fff', border: '1px solid #e2e8f0', color: '#475569', padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700 }}>
                                                    {p.name}
                                                </span>
                                            ))}
                                            {role.permissions?.length > 6 && (
                                                <span style={{ background: '#eef2ff', color: '#6366f1', padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800 }}>
                                                    +{role.permissions.length - 6} more
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ display: 'flex', marginLeft: 4 }}>
                                            {[1,2,3].map(i => (
                                                <div key={i} style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #f8fafc', background: '#e2e8f0', marginLeft: -8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#94a3b8' }}>
                                                    <i className="bx bx-user" />
                                                </div>
                                            ))}
                                        </div>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                                            {stats.role_stats?.find(rs => rs.admin_role === role.name)?.count || 0} Personnel
                                        </span>
                                    </div>
                                    <span style={{ fontSize: 11, color: '#cbd5e1', fontWeight: 600 }}>Sync: {formatDate(role.updated_at).split(',')[0]}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- PERMISSIONS TAB --- */}
            {activeTab === 'permissions' && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    {/* Hero Header */}
                    <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: '40px', borderRadius: 32, marginBottom: 32, color: '#fff', position: 'relative', overflow: 'hidden', boxShadow: '0 20px 40px rgba(15,23,42,0.15)' }}>
                        <div style={{ position: 'absolute', right: -20, bottom: -20, fontSize: 200, color: 'rgba(255,255,255,0.03)', transform: 'rotate(-15deg)' }}>
                            <i className="bx bx-key" />
                        </div>
                        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 20 }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1' }} />
                                    <span style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Registry Otoritas</span>
                                </div>
                                <h2 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: '-0.5px' }}>Permission Matrix</h2>
                                <p style={{ margin: '12px 0 0 0', fontSize: 15, color: '#94a3b8', maxWidth: 600, lineHeight: 1.6 }}>
                                    Daftar izin akses per fitur sidebar — baris = fitur, kolom = aksi CRUD.
                                </p>
                            </div>
                            <div style={{ ...A.searchWrap, width: 300 }}>
                                <i className="bx bx-search" style={{ ...A.searchIcon, color: '#fff' }} />
                                <input type="text" placeholder="Cari fitur atau modul..." className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:border-indigo-400 transition-all w-full" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', width: '100%' }} onChange={(e) => setSearchTerm(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* CRUD MATRIX TABLE */}
                    {(() => {
                        const SIDEBAR_MATRIX = [
                            { section: 'DASHBOARD', features: [
                                { label: 'Dashboard & Analitik', icon: 'bx-grid-alt', color: '#6366f1', view: 'view_dashboard', create: null, update: 'view_analytics', delete: 'view_notifications' },
                            ]},
                            { section: 'PRODUK & KATALOG', features: [
                                { label: 'Produk', icon: 'bx-package', color: '#8b5cf6', view: 'product_view', create: 'product_create', update: 'product_update', delete: 'product_delete' },
                                { label: 'Kategori', icon: 'bx-category', color: '#7c3aed', view: 'category_view', create: 'category_create', update: 'category_update', delete: 'category_delete' },
                                { label: 'Varian & Harga', icon: 'bx-git-branch', color: '#a855f7', view: 'product_view', create: 'product_manage_variant', update: 'product_manage_pricing', delete: 'product_bulk_action' },
                            ]},
                            { section: 'PENJUALAN', features: [
                                { label: 'Pesanan', icon: 'bx-cart', color: '#10b981', view: 'order_view', create: null, update: 'order_update_status', delete: 'order_cancel' },
                                { label: 'Keuangan Pesanan', icon: 'bx-receipt', color: '#059669', view: 'order_view_financial', create: null, update: null, delete: 'order_export' },
                                { label: 'Refund & Dispute', icon: 'bx-undo', color: '#34d399', view: 'order_view', create: 'order_refund', update: null, delete: null },
                            ]},
                            { section: 'INVENTARIS', features: [
                                { label: 'Stok Gudang', icon: 'bx-building-house', color: '#f59e0b', view: 'inventory_view', create: 'inventory_inbound', update: 'inventory_update', delete: null },
                                { label: 'Mutasi & Restock', icon: 'bx-transfer', color: '#d97706', view: 'inventory_mutation', create: 'inventory_restock', update: null, delete: 'inventory_report' },
                            ]},
                            { section: 'PENGGUNA', features: [
                                { label: 'Pengguna', icon: 'bx-user', color: '#3b82f6', view: 'user_view', create: 'user_create', update: 'user_update', delete: 'user_delete' },
                                { label: 'Suspend & Wallet', icon: 'bx-wallet', color: '#2563eb', view: 'user_view_wallet', create: null, update: 'user_suspend', delete: null },
                            ]},
                            { section: 'MERCHANT / TOKO', features: [
                                { label: 'Merchant', icon: 'bx-store-alt', color: '#ec4899', view: 'merchant_view', create: 'merchant_create', update: 'merchant_update', delete: 'merchant_suspend' },
                                { label: 'Verifikasi & Payout', icon: 'bx-check-shield', color: '#db2777', view: 'merchant_view_payout', create: null, update: 'merchant_verify', delete: null },
                            ]},
                            { section: 'AFILIASI', features: [
                                { label: 'Mitra Afiliasi', icon: 'bx-group', color: '#06b6d4', view: 'affiliate_view', create: null, update: 'affiliate_update_tier', delete: null },
                                { label: 'Tier & Komisi', icon: 'bx-trophy', color: '#0891b2', view: 'affiliate_view_commission', create: 'affiliate_manage_tiers', update: 'affiliate_manage_materials', delete: 'affiliate_approve_withdrawal' },
                            ]},
                            { section: 'KEUANGAN', features: [
                                { label: 'Laporan Keuangan', icon: 'bx-bar-chart-alt-2', color: '#14b8a6', view: 'finance_view_summary', create: null, update: 'finance_view_reports', delete: 'finance_export_reports' },
                                { label: 'Payout & Transaksi', icon: 'bx-transfer-alt', color: '#0d9488', view: 'finance_view_transactions', create: 'finance_process_payout', update: null, delete: null },
                            ]},
                            { section: 'KONTEN & MARKETING', features: [
                                { label: 'Voucher Promo', icon: 'bx-purchase-tag', color: '#f97316', view: 'marketing_view_voucher', create: 'marketing_create_voucher', update: 'marketing_update_voucher', delete: 'marketing_delete_voucher' },
                                { label: 'Banner & Promo', icon: 'bx-image', color: '#ea580c', view: 'marketing_view_banner', create: 'marketing_manage_banner', update: null, delete: null },
                                { label: 'Blog & Edukasi', icon: 'bx-news', color: '#dc2626', view: null, create: 'content_blog', update: 'content_education', delete: 'content_event' },
                                { label: 'Bahan Promosi', icon: 'bx-brush', color: '#b91c1c', view: null, create: 'content_promo_material', update: null, delete: null },
                            ]},
                            { section: 'SISTEM & KEAMANAN', features: [
                                { label: 'Hak Akses / RBAC', icon: 'bx-shield-quarter', color: '#8b5cf6', view: 'rbac_view', create: 'rbac_manage_staff', update: 'rbac_manage_roles', delete: 'rbac_assign_role' },
                                { label: 'Pengaturan Platform', icon: 'bx-cog', color: '#6d28d9', view: 'settings_view', create: null, update: 'settings_update', delete: null },
                                { label: 'Payment & SMTP', icon: 'bx-credit-card', color: '#5b21b6', view: 'settings_view', create: null, update: 'settings_manage_payment', delete: 'settings_manage_smtp' },
                            ]},
                            { section: 'LAPORAN', features: [
                                { label: 'Laporan Penjualan', icon: 'bx-file', color: '#64748b', view: 'report_sales', create: null, update: 'report_users', delete: 'report_export_all' },
                                { label: 'Laporan Inventaris', icon: 'bx-spreadsheet', color: '#475569', view: 'report_inventory', create: null, update: null, delete: null },
                            ]},
                        ];

                        const permByCode = {};
                        permissions.forEach(p => { permByCode[p.code] = p; });

                        const CRUD_COLS = [
                            { key: 'view',   label: 'VIEW',   icon: 'bx-show',       color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
                            { key: 'create', label: 'CREATE', icon: 'bx-plus-circle', color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0' },
                            { key: 'update', label: 'UPDATE', icon: 'bx-edit',        color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
                            { key: 'delete', label: 'DELETE', icon: 'bx-trash',       color: '#ef4444', bg: '#fff1f2', border: '#fecdd3' },
                        ];

                        const filtered = SIDEBAR_MATRIX.map(s => ({
                            ...s,
                            features: s.features.filter(f =>
                                !searchTerm || f.label.toLowerCase().includes(searchTerm.toLowerCase()) || s.section.toLowerCase().includes(searchTerm.toLowerCase())
                            )
                        })).filter(s => s.features.length > 0);

                        const CrudCell = ({ code }) => {
                            if (!code) return (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ width: 26, height: 26, borderRadius: 7, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <i className="bx bx-minus" style={{ color: '#cbd5e1', fontSize: 14 }} />
                                    </div>
                                </div>
                            );
                            const perm = permByCode[code];
                            return (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div
                                        title={perm ? `${perm.name}\n(${perm.code})` : code}
                                        style={{ width: 30, height: 30, borderRadius: 9, background: perm ? '#d1fae5' : '#fef3c7', border: `1.5px solid ${perm ? '#6ee7b7' : '#fde68a'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'default', transition: '0.15s ease' }}
                                        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.18)'; e.currentTarget.style.boxShadow = `0 4px 12px ${perm ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`; }}
                                        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
                                    >
                                        <i className={`bx ${perm ? 'bx-check' : 'bx-question-mark'}`} style={{ color: perm ? '#059669' : '#d97706', fontSize: 15, fontWeight: 900 }} />
                                    </div>
                                </div>
                            );
                        };

                        return (
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm" style={{ padding: 0, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 660 }}>
                                        <thead>
                                            <tr style={{ background: 'linear-gradient(90deg, #1e1b4b 0%, #312e81 100%)' }}>
                                                <th style={{ padding: '20px 24px', textAlign: 'left', color: '#e0e7ff', fontSize: 11, fontWeight: 900, letterSpacing: '0.09em', textTransform: 'uppercase', width: '36%', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                                        <i className="bx bx-sidebar" style={{ fontSize: 17 }} /> FITUR / MODUL SIDEBAR
                                                    </div>
                                                </th>
                                                {CRUD_COLS.map(col => (
                                                    <th key={col.key} style={{ padding: '16px 10px', textAlign: 'center', width: '14%', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                                                        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
                                                            <div style={{ width: 36, height: 36, borderRadius: 11, background: col.bg, border: `1.5px solid ${col.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <i className={`bx ${col.icon}`} style={{ color: col.color, fontSize: 18 }} />
                                                            </div>
                                                            <span style={{ fontSize: 10.5, fontWeight: 900, color: col.color, letterSpacing: '0.07em' }}>{col.label}</span>
                                                        </div>
                                                    </th>
                                                ))}
                                                <th style={{ padding: '16px 10px', textAlign: 'center', width: '22%' }}>
                                                    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
                                                        <div style={{ width: 36, height: 36, borderRadius: 11, background: '#1e293b', border: '1.5px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <i className="bx bx-code-alt" style={{ color: '#94a3b8', fontSize: 18 }} />
                                                        </div>
                                                        <span style={{ fontSize: 10.5, fontWeight: 900, color: '#94a3b8', letterSpacing: '0.07em' }}>KODE PERMISSION</span>
                                                    </div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filtered.map((section, si) => (
                                                <React.Fragment key={section.section}>
                                                    <tr style={{ background: 'linear-gradient(90deg, #f8fafc, #f1f5f9)' }}>
                                                        <td colSpan={6} style={{ padding: '9px 24px', borderTop: si > 0 ? '2px solid #e2e8f0' : 'none', borderBottom: '1px solid #e2e8f0' }}>
                                                            <div style={{ fontSize: 10, fontWeight: 900, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.13em', display: 'flex', alignItems: 'center', gap: 9 }}>
                                                                <div style={{ width: 3, height: 14, background: '#6366f1', borderRadius: 2 }} />
                                                                {section.section}
                                                                <span style={{ fontSize: 10, background: '#e0e7ff', color: '#6366f1', padding: '1px 8px', borderRadius: 20, fontWeight: 800 }}>{section.features.length} fitur</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {section.features.map((feat) => (
                                                        <tr key={feat.label} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.12s' }}
                                                            onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                            <td style={{ padding: '13px 24px', borderRight: '1px solid #f1f5f9' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                                    <div style={{ width: 38, height: 38, borderRadius: 11, background: `${feat.color}15`, border: `1px solid ${feat.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                        <i className={`bx ${feat.icon}`} style={{ color: feat.color, fontSize: 18 }} />
                                                                    </div>
                                                                    <div>
                                                                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#1e293b' }}>{feat.label}</div>
                                                                        <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 2 }}>
                                                                            {[feat.view, feat.create, feat.update, feat.delete].filter(Boolean).length} permission aktif
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            {CRUD_COLS.map(col => (
                                                                <td key={col.key} style={{ padding: '13px 10px', textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
                                                                    <CrudCell code={feat[col.key]} />
                                                                </td>
                                                            ))}
                                                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
                                                                    {[feat.view, feat.create, feat.update, feat.delete].filter(Boolean).map(code => (
                                                                        <span key={code} style={{ fontSize: 9, fontFamily: 'monospace', color: '#6366f1', background: '#eef2ff', padding: '2px 7px', borderRadius: 5, fontWeight: 700, whiteSpace: 'nowrap', letterSpacing: '0.02em' }}>{code}</span>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Legend Footer */}
                                <div style={{ padding: '14px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Keterangan:</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                        <div style={{ width: 22, height: 22, borderRadius: 7, background: '#d1fae5', border: '1.5px solid #6ee7b7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <i className="bx bx-check" style={{ color: '#059669', fontSize: 13 }} />
                                        </div>
                                        <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Permission aktif di sistem</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                        <div style={{ width: 22, height: 22, borderRadius: 7, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <i className="bx bx-minus" style={{ color: '#cbd5e1', fontSize: 13 }} />
                                        </div>
                                        <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Tidak berlaku / N/A</span>
                                    </div>
                                    <div style={{ marginLeft: 'auto', fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
                                        Total: <strong style={{ color: '#6366f1' }}>{permissions.length}</strong> permission aktif dalam sistem
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}


            {/* --- MODALS --- */}
            
            {/* Preview User Modal */}
            {previewUser && (
                <Modal title={`Otoritas Personel: ${previewUser.profile?.full_name}`} onClose={() => setPreviewUser(null)}>
                    <div style={{ padding: 20, background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid #e2e8f0' }}>
                            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5', fontSize: 24, fontWeight: 800 }}>
                                {(previewUser.profile?.full_name || 'U')[0].toUpperCase()}
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#1e293b' }}>{previewUser.profile?.full_name}</h3>
                                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{previewUser.email} • {previewUser.department || 'No Dept'}</div>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '4px 10px', background: '#d1fae5', color: '#059669', borderRadius: 8, fontSize: 11, fontWeight: 800 }}>
                                    <i className="bx bx-shield-quarter" /> {previewUser.role === 'superadmin' ? 'SUPERADMIN (Full Access)' : (previewUser.admin_role || 'No Role')}
                                </div>
                            </div>
                        </div>

                        <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 16, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>Izin Akses Spesifik</div>
                        {previewUser.role === 'superadmin' ? (
                            <div style={{ padding: 20, background: '#f0fdf4', borderRadius: 12, border: '1px solid #bbf7d0', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                                <i className="bx bxs-check-shield" style={{ fontSize: 32, color: '#10b981' }} />
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 800, color: '#166534' }}>Akses Penuh Keseluruhan Sistem</div>
                                    <div style={{ fontSize: 12, color: '#15803d', marginTop: 4 }}>Sebagai Superadmin, akun ini mengabaikan semua batasan RBAC dan memiliki wewenang penuh atas seluruh modul dan fungsi platform AkuGlow.</div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, maxHeight: 400, overflowY: 'auto', paddingRight: 8 }}>
                                {getAdminPermissions(previewUser.admin_role).map(p => (
                                    <div key={p.id} style={{ fontSize: 11, padding: '10px 14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                                        <i className="bx bx-check-circle" style={{ color: '#10b981', fontSize: 16 }} /> 
                                        <span style={{ fontWeight: 600, color: '#334155' }}>{p.name}</span>
                                    </div>
                                ))}
                                {getAdminPermissions(previewUser.admin_role).length === 0 && (
                                    <div style={{ gridColumn: '1 / -1', padding: 24, textAlign: 'center', background: '#fff', borderRadius: 12, border: '1px dashed #cbd5e1', color: '#64748b', fontSize: 13 }}>
                                        Role <strong style={{ color: '#0f172a' }}>{previewUser.admin_role}</strong> tidak memiliki izin akses khusus.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </Modal>
            )}

            {/* Role Modal */}
            {showRoleModal && selectedRole && (
                <Modal title={selectedRole.id ? "UPDATE SECURITY PROFILE" : "CREATE NEW SECURITY PROFILE"} onClose={() => setShowRoleModal(false)} wide>
                    <form onSubmit={handleSaveRole}>
                        <div className="rbac-modal-grid">
                            <div className="rbac-modal-left">
                                <div style={{ background: '#f8fafc', padding: 24, borderRadius: 16, border: '1px solid #e2e8f0', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                    <div>
                                        <h4 style={{ margin: '0 0 20px 0', fontSize: 14, fontWeight: 900, color: '#1e293b', letterSpacing: '-0.3px' }}>DETAIL PROFILE</h4>
                                        
                                        <div style={{ marginBottom: 16 }}>
                                            <FieldLabel>Profile Name</FieldLabel>
                                            <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400" style={{ background: '#fff', border: '1.5px solid #e2e8f0', fontWeight: 600 }} placeholder="e.g. Senior CS Analyst" value={selectedRole.name} onChange={e=>setSelectedRole({...selectedRole, name: e.target.value})} required />
                                        </div>
                                        
                                        <div style={{ marginBottom: 16 }}>
                                            <FieldLabel>Operational Context / Description</FieldLabel>
                                            <textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400" style={{ height: 140, background: '#fff', border: '1.5px solid #e2e8f0', resize: 'none', lineHeight: 1.5 }} placeholder="Jelaskan ruang lingkup dan tanggung jawab dari profile ini..." value={selectedRole.description} onChange={e=>setSelectedRole({...selectedRole, description: e.target.value})} />
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <div style={{ padding: 18, background: 'linear-gradient(135deg, #f5f7ff 0%, #e0e7ff 100%)', borderRadius: 16, border: '1px solid #c7d2fe' }}>
                                            <div style={{ fontSize: 11, fontWeight: 900, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Status Sinkronisasi</div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Total Izin Terpilih:</span>
                                                <span style={{ fontSize: 20, fontWeight: 900, color: '#4f46e5', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <i className="bx bx-key" /> {(selectedRole.permission_ids || []).length}
                                                </span>
                                            </div>
                                        </div>

                                        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm" style={{ width: '100%', height: 48, fontSize: 13.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 }} type="submit">
                                            <i className="bx bx-save" style={{ fontSize: 18 }} /> SAVE PROFILE
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="rbac-modal-right">
                                <div className="rbac-tab-header" style={{ marginBottom: 16 }}>
                                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: '#1e293b', letterSpacing: '-0.3px' }}>Matrix CRUD Permission</h4>
                                    <div style={{ fontSize: 11.5, color: '#4f46e5', background: '#eef2ff', padding: '6px 14px', borderRadius: 20, fontWeight: 800 }}>
                                        Klik sel untuk aktifkan / nonaktifkan permission
                                    </div>
                                </div>

                                {/* CRUD Matrix Interactive Table */}
                                {(() => {
                                    const MODAL_MATRIX = [
                                        { section: 'Dashboard', features: [
                                            { label: 'Dashboard', icon: 'bx-grid-alt', color: '#6366f1', view: 'view_dashboard', create: null, update: 'view_analytics', delete: 'view_notifications' },
                                        ]},
                                        { section: 'Produk & Katalog', features: [
                                            { label: 'Produk', icon: 'bx-package', color: '#8b5cf6', view: 'product_view', create: 'product_create', update: 'product_update', delete: 'product_delete' },
                                            { label: 'Kategori', icon: 'bx-category', color: '#7c3aed', view: 'category_view', create: 'category_create', update: 'category_update', delete: 'category_delete' },
                                            { label: 'Varian & Harga', icon: 'bx-git-branch', color: '#a855f7', view: 'product_view', create: 'product_manage_variant', update: 'product_manage_pricing', delete: 'product_bulk_action' },
                                        ]},
                                        { section: 'Penjualan', features: [
                                            { label: 'Pesanan', icon: 'bx-cart', color: '#10b981', view: 'order_view', create: null, update: 'order_update_status', delete: 'order_cancel' },
                                            { label: 'Keuangan Pesanan', icon: 'bx-receipt', color: '#059669', view: 'order_view_financial', create: null, update: null, delete: 'order_export' },
                                            { label: 'Refund & Dispute', icon: 'bx-undo', color: '#34d399', view: 'order_view', create: 'order_refund', update: null, delete: null },
                                        ]},
                                        { section: 'Inventaris', features: [
                                            { label: 'Stok Gudang', icon: 'bx-building-house', color: '#f59e0b', view: 'inventory_view', create: 'inventory_inbound', update: 'inventory_update', delete: null },
                                            { label: 'Mutasi & Restock', icon: 'bx-transfer', color: '#d97706', view: 'inventory_mutation', create: 'inventory_restock', update: null, delete: 'inventory_report' },
                                        ]},
                                        { section: 'Pengguna', features: [
                                            { label: 'Pengguna', icon: 'bx-user', color: '#3b82f6', view: 'user_view', create: 'user_create', update: 'user_update', delete: 'user_delete' },
                                            { label: 'Suspend & Wallet', icon: 'bx-wallet', color: '#2563eb', view: 'user_view_wallet', create: null, update: 'user_suspend', delete: null },
                                        ]},
                                        { section: 'Merchant / Toko', features: [
                                            { label: 'Merchant', icon: 'bx-store-alt', color: '#ec4899', view: 'merchant_view', create: 'merchant_create', update: 'merchant_update', delete: 'merchant_suspend' },
                                            { label: 'Verifikasi & Payout', icon: 'bx-check-shield', color: '#db2777', view: 'merchant_view_payout', create: null, update: 'merchant_verify', delete: null },
                                        ]},
                                        { section: 'Afiliasi', features: [
                                            { label: 'Mitra Afiliasi', icon: 'bx-group', color: '#06b6d4', view: 'affiliate_view', create: null, update: 'affiliate_update_tier', delete: null },
                                            { label: 'Tier & Komisi', icon: 'bx-trophy', color: '#0891b2', view: 'affiliate_view_commission', create: 'affiliate_manage_tiers', update: 'affiliate_manage_materials', delete: 'affiliate_approve_withdrawal' },
                                        ]},
                                        { section: 'Keuangan', features: [
                                            { label: 'Laporan Keuangan', icon: 'bx-bar-chart-alt-2', color: '#14b8a6', view: 'finance_view_summary', create: null, update: 'finance_view_reports', delete: 'finance_export_reports' },
                                            { label: 'Payout & Transaksi', icon: 'bx-transfer-alt', color: '#0d9488', view: 'finance_view_transactions', create: 'finance_process_payout', update: null, delete: null },
                                        ]},
                                        { section: 'Konten & Marketing', features: [
                                            { label: 'Voucher Promo', icon: 'bx-purchase-tag', color: '#f97316', view: 'marketing_view_voucher', create: 'marketing_create_voucher', update: 'marketing_update_voucher', delete: 'marketing_delete_voucher' },
                                            { label: 'Banner & Promo', icon: 'bx-image', color: '#ea580c', view: 'marketing_view_banner', create: 'marketing_manage_banner', update: null, delete: null },
                                            { label: 'Blog & Edukasi', icon: 'bx-news', color: '#dc2626', view: null, create: 'content_blog', update: 'content_education', delete: 'content_event' },
                                            { label: 'Bahan Promosi', icon: 'bx-brush', color: '#b91c1c', view: null, create: 'content_promo_material', update: null, delete: null },
                                        ]},
                                        { section: 'Sistem & Keamanan', features: [
                                            { label: 'Hak Akses / RBAC', icon: 'bx-shield-quarter', color: '#8b5cf6', view: 'rbac_view', create: 'rbac_manage_staff', update: 'rbac_manage_roles', delete: 'rbac_assign_role' },
                                            { label: 'Pengaturan Platform', icon: 'bx-cog', color: '#6d28d9', view: 'settings_view', create: null, update: 'settings_update', delete: null },
                                            { label: 'Payment & SMTP', icon: 'bx-credit-card', color: '#5b21b6', view: 'settings_view', create: null, update: 'settings_manage_payment', delete: 'settings_manage_smtp' },
                                        ]},
                                        { section: 'Laporan', features: [
                                            { label: 'Laporan Penjualan', icon: 'bx-file', color: '#64748b', view: 'report_sales', create: null, update: 'report_users', delete: 'report_export_all' },
                                            { label: 'Laporan Inventaris', icon: 'bx-spreadsheet', color: '#475569', view: 'report_inventory', create: null, update: null, delete: null },
                                        ]},
                                    ];

                                    const permByCode = {};
                                    permissions.forEach(p => { permByCode[p.code] = p; });

                                    const CRUD_COLS = [
                                        { key: 'view',   label: 'VIEW',   icon: 'bx-show',        color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
                                        { key: 'create', label: 'CREATE', icon: 'bx-plus-circle',  color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0' },
                                        { key: 'update', label: 'UPDATE', icon: 'bx-edit',         color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
                                        { key: 'delete', label: 'DELETE', icon: 'bx-trash',        color: '#ef4444', bg: '#fff1f2', border: '#fecdd3' },
                                    ];

                                    const toggleByCode = (code) => {
                                        const perm = permByCode[code];
                                        if (!perm) return;
                                        togglePermission(perm.id);
                                    };

                                    const isCheckedByCode = (code) => {
                                        const perm = permByCode[code];
                                        if (!perm) return false;
                                        return (selectedRole.permission_ids || []).includes(perm.id);
                                    };

                                    const InteractiveCell = ({ code, colColor, colBg, colBorder }) => {
                                        if (!code) return (
                                            <td style={{ padding: '10px 6px', textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
                                                <div style={{ width: 28, height: 28, borderRadius: 8, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 'auto' }}>
                                                    <i className="bx bx-minus" style={{ color: '#e2e8f0', fontSize: 14 }} />
                                                </div>
                                            </td>
                                        );
                                        const checked = isCheckedByCode(code);
                                        const perm = permByCode[code];
                                        return (
                                            <td style={{ padding: '10px 6px', textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
                                                <div
                                                    title={perm ? perm.name : code}
                                                    onClick={() => toggleByCode(code)}
                                                    style={{
                                                        width: 32, height: 32, borderRadius: 9, margin: 'auto',
                                                        background: checked ? colBg : '#f8fafc',
                                                        border: `2px solid ${checked ? colColor : '#e2e8f0'}`,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        cursor: 'pointer', transition: 'all 0.18s ease',
                                                        boxShadow: checked ? `0 4px 10px ${colColor}33` : 'none',
                                                    }}
                                                    onMouseEnter={e => { if (!checked) { e.currentTarget.style.borderColor = colColor; e.currentTarget.style.background = colBg; } e.currentTarget.style.transform = 'scale(1.14)'; }}
                                                    onMouseLeave={e => { if (!checked) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; } e.currentTarget.style.transform = 'scale(1)'; }}
                                                >
                                                    {checked
                                                        ? <i className="bx bx-check" style={{ color: colColor, fontSize: 18, fontWeight: 900 }} />
                                                        : <i className="bx bx-plus" style={{ color: '#cbd5e1', fontSize: 15 }} />
                                                    }
                                                </div>
                                            </td>
                                        );
                                    };

                                    return (
                                        <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid #e2e8f0', maxHeight: '52vh', overflowY: 'auto', background: '#fff' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
                                                <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                                                    <tr style={{ background: 'linear-gradient(90deg, #1e1b4b 0%, #312e81 100%)' }}>
                                                        <th style={{ padding: '14px 18px', textAlign: 'left', color: '#e0e7ff', fontSize: 10.5, fontWeight: 900, letterSpacing: '0.09em', textTransform: 'uppercase', width: '36%', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <i className="bx bx-sidebar" style={{ fontSize: 16 }} /> FITUR SIDEBAR
                                                            </div>
                                                        </th>
                                                        {CRUD_COLS.map(col => (
                                                            <th key={col.key} style={{ padding: '12px 6px', textAlign: 'center', width: '14%', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                                                                <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                                                                    <div style={{ width: 30, height: 30, borderRadius: 9, background: col.bg, border: `1.5px solid ${col.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        <i className={`bx ${col.icon}`} style={{ color: col.color, fontSize: 16 }} />
                                                                    </div>
                                                                    <span style={{ fontSize: 9.5, fontWeight: 900, color: col.color, letterSpacing: '0.06em' }}>{col.label}</span>
                                                                </div>
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {MODAL_MATRIX.map((section, si) => (
                                                        <React.Fragment key={section.section}>
                                                            <tr style={{ background: 'linear-gradient(90deg, #f8fafc, #f1f5f9)' }}>
                                                                <td colSpan={5} style={{ padding: '7px 18px', borderTop: si > 0 ? '2px solid #e2e8f0' : 'none', borderBottom: '1px solid #e2e8f0' }}>
                                                                    <div style={{ fontSize: 9.5, fontWeight: 900, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.12em', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                        <div style={{ width: 3, height: 12, background: '#6366f1', borderRadius: 2 }} />
                                                                        {section.section}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                            {section.features.map(feat => {
                                                                const activeCount = [feat.view, feat.create, feat.update, feat.delete].filter(c => c && isCheckedByCode(c)).length;
                                                                const totalCount  = [feat.view, feat.create, feat.update, feat.delete].filter(Boolean).length;
                                                                return (
                                                                    <tr key={feat.label} style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.1s' }}
                                                                        onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                                                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                                        <td style={{ padding: '10px 18px', borderRight: '1px solid #f1f5f9' }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                                                <div style={{ width: 32, height: 32, borderRadius: 9, background: `${feat.color}18`, border: `1px solid ${feat.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                                    <i className={`bx ${feat.icon}`} style={{ color: feat.color, fontSize: 16 }} />
                                                                                </div>
                                                                                <div>
                                                                                    <div style={{ fontSize: 12.5, fontWeight: 800, color: '#1e293b' }}>{feat.label}</div>
                                                                                    <div style={{ fontSize: 10, color: activeCount > 0 ? '#10b981' : '#94a3b8', marginTop: 1, fontWeight: 700 }}>
                                                                                        {activeCount > 0 ? `${activeCount}/${totalCount} aktif` : 'belum dipilih'}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        {CRUD_COLS.map(col => (
                                                                            <InteractiveCell key={col.key} code={feat[col.key]} colColor={col.color} colBg={col.bg} colBorder={col.border} />
                                                                        ))}
                                                                    </tr>
                                                                );
                                                            })}
                                                        </React.Fragment>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </form>
                </Modal>
            )}

            {/* User Onboarding Modal */}
            {showUserModal && (
                <Modal 
                    title={selectedUser ? "MANAGE PERSONNEL ACCESS" : "ONBOARD NEW PERSONNEL"} 
                    onClose={() => { setShowUserModal(false); setSelectedUser(null); }}
                    wide
                >
                    <form onSubmit={handleSaveUser} className="rbac-user-grid" style={{ marginTop: 10 }}>
                        
                        {/* LEFT COLUMN: BASIC INFO */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            <div style={{ padding: '0 0 10px 0', borderBottom: '1px solid #f1f5f9' }}>
                                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <i className="bx bx-user" style={{ color: '#d97706' }} />
                                    </div>
                                    Identity Profile
                                </h4>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div>
                                    <FieldLabel>Full Name</FieldLabel>
                                    <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400" placeholder="Nama Lengkap Staff" value={newUser.full_name} onChange={e=>setNewUser({...newUser, full_name: e.target.value})} required />
                                </div>
                                <div>
                                    <FieldLabel>Email Address</FieldLabel>
                                    <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400" style={{ background: selectedUser ? '#f8fafc' : '#f8fafc' }} type="email" placeholder="email@perusahaan.com" value={newUser.email} onChange={e=>setNewUser({...newUser, email: e.target.value})} required={!selectedUser} disabled={!!selectedUser} />
                                    {selectedUser && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6 }}>Email cannot be modified for existing personnel.</div>}
                                </div>
                                {!selectedUser && (
                                    <div>
                                        <FieldLabel>System Password</FieldLabel>
                                        <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400" type="password" placeholder="Password minimal 8 karakter" value={newUser.password} onChange={e=>setNewUser({...newUser, password: e.target.value})} required />
                                    </div>
                                )}
                                <div>
                                    <FieldLabel>Corporate Department</FieldLabel>
                                    <AdminSelect className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400" value={newUser.department} onChange={e=>setNewUser({...newUser, department: e.target.value})}>
                                        <option value="">No Department / General</option>
                                        <option value="IT & SYSTEMS">IT & SYSTEMS</option>
                                        <option value="MARKETING">MARKETING</option>
                                        <option value="FINANCE">FINANCE</option>
                                        <option value="CUSTOMER SERVICE">CUSTOMER SERVICE</option>
                                        <option value="LOGISTICS">LOGISTICS</option>
                                        <option value="MANAGEMENT">MANAGEMENT</option>
                                    </AdminSelect>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: ACCESS CONTROL */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            <div style={{ padding: '0 0 10px 0', borderBottom: '1px solid #f1f5f9' }}>
                                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <i className="bx bx-shield-quarter" style={{ color: '#6366f1' }} />
                                    </div>
                                    Security & Privileges
                                </h4>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                <div>
                                    <FieldLabel>Privilege Level</FieldLabel>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        <button type="button" onClick={()=>setNewUser({...newUser, role: 'admin'})} style={{
                                            padding: '16px', borderRadius: 16, border: `2px solid ${newUser.role === 'admin' ? '#6366f1' : '#f1f5f9'}`,
                                            background: newUser.role === 'admin' ? '#f5f7ff' : '#fff', cursor: 'pointer', textAlign: 'left', transition: '0.2s'
                                        }}>
                                            <div style={{ fontSize: 13, fontWeight: 900, color: '#1e293b' }}>RESTRICTED</div>
                                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Standard staff access with specific roles.</div>
                                        </button>
                                        <button type="button" onClick={()=>setNewUser({...newUser, role: 'superadmin'})} style={{
                                            padding: '16px', borderRadius: 16, border: `2px solid ${newUser.role === 'superadmin' ? '#ef4444' : '#f1f5f9'}`,
                                            background: newUser.role === 'superadmin' ? '#fef2f2' : '#fff', cursor: 'pointer', textAlign: 'left', transition: '0.2s'
                                        }}>
                                            <div style={{ fontSize: 13, fontWeight: 900, color: '#991b1b' }}>SUPERADMIN</div>
                                            <div style={{ fontSize: 11, color: '#b91c1c', marginTop: 4 }}>Full system access & root control.</div>
                                        </button>
                                    </div>
                                </div>

                                <div style={{ background: '#f8fafc', padding: 24, borderRadius: 24, border: '1px solid #e2e8f0', flex: 1 }}>
                                    <FieldLabel>Security Profile Assignment</FieldLabel>
                                    {newUser.role === 'superadmin' ? (
                                        <div style={{ padding: '16px', background: '#fff', borderRadius: 14, border: '2px dashed #fecaca', textAlign: 'center', color: '#ef4444' }}>
                                            <i className="bx bxs-check-shield" style={{ fontSize: 24, marginBottom: 8 }} />
                                            <div style={{ fontSize: 12, fontWeight: 800 }}>NOT REQUIRED</div>
                                            <div style={{ fontSize: 11, marginTop: 4 }}>Superadmins bypass all role-based checks.</div>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            <AdminSelect 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400" style={{ width: '100%', height: 44 }} 
                                                value={newUser.admin_role} 
                                                onChange={e=>setNewUser({...newUser, admin_role: e.target.value})} 
                                                required={newUser.role === 'admin'}
                                            >
                                                <option value="">-- Choose a Security Profile --</option>
                                                {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                                            </AdminSelect>
                                            
                                            {newUser.admin_role && (
                                                <div style={{ padding: 12, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                                                    <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>Enabled Capabilities</div>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                        {getAdminPermissions(newUser.admin_role).slice(0, 6).map(p => (
                                                            <span key={p.id} style={{ fontSize: 9, background: '#eef2ff', color: '#6366f1', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>{p.name}</span>
                                                        ))}
                                                        {getAdminPermissions(newUser.admin_role).length > 6 && (
                                                            <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700 }}>+{getAdminPermissions(newUser.admin_role).length - 6} more</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm" style={{ width: '100%', height: 54, borderRadius: 16, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 10 }} type="submit">
                                    <i className="bx bx-check-shield" style={{ fontSize: 22 }} /> 
                                    {selectedUser ? 'SAVE ACCESS CHANGES' : 'AUTHORIZE PERSONNEL'}
                                </button>
                            </div>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default AdminRBAC;
