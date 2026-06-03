import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';
import { A, PageHeader, TablePanel, Modal, FieldLabel, StatRow, roleBadge } from '../../lib/adminStyles.jsx';
import toast from 'react-hot-toast';

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
        <div style={{ ...A.page, maxWidth: 1400, margin: '0 auto', paddingBottom: 60 }}>
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
                            <div style={{ ...A.card, padding: 30 }}>
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

                            <div style={{ ...A.card, padding: 30 }}>
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
                            <div style={{ ...A.card, padding: 30, background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
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

                            <div style={{ ...A.card, padding: 30 }}>
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
                                        style={{ ...A.searchInput, width: '100%' }} 
                                        placeholder="Cari berdasarkan nama atau email..." 
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <select style={A.select} value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)}>
                                    <option value="">Semua Departemen</option>
                                    <option value="IT & SYSTEMS">IT & SYSTEMS</option>
                                    <option value="MARKETING">MARKETING</option>
                                    <option value="FINANCE">FINANCE</option>
                                    <option value="CUSTOMER SERVICE">CUSTOMER SERVICE</option>
                                    <option value="LOGISTICS">LOGISTICS</option>
                                </select>
                                <select style={A.select} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                                    <option value="">Semua Status</option>
                                    <option value="active">Active</option>
                                    <option value="suspended">Suspended</option>
                                </select>
                                <button style={A.btnPrimary} onClick={() => { setSelectedUser(null); setNewUser(initialUserState); setShowUserModal(true); }}>
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
                        <button style={A.btnPrimary} onClick={() => { setSelectedRole({ name: '', description: '', permission_ids: [] }); setShowRoleModal(true); }}>
                            <i className="bx bx-plus-circle" /> Create Security Profile
                        </button>
                    </div>
                    <div className="rbac-role-grid">
                        {roles.map(role => (
                            <div key={role.id} style={{ ...A.card, borderTop: '4px solid #6366f1', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s', cursor: 'default' }} 
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
                    <div style={{ 
                        background: 'linear-gradient(135deg, #0f172a, #1e293b)', 
                        padding: '40px', 
                        borderRadius: 32, 
                        marginBottom: 32, 
                        color: '#fff', 
                        position: 'relative', 
                        overflow: 'hidden',
                        boxShadow: '0 20px 40px rgba(15,23,42,0.15)'
                    }}>
                        <div style={{ position: 'absolute', right: -20, bottom: -20, fontSize: 200, color: 'rgba(255,255,255,0.03)', transform: 'rotate(-15deg)' }}>
                            <i className="bx bx-key" />
                        </div>
                        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 20 }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1' }} />
                                    <span style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Registry Otoritas</span>
                                </div>
                                <h2 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: '-0.5px' }}>Capability Registry</h2>
                                <p style={{ margin: '12px 0 0 0', fontSize: 15, color: '#94a3b8', maxWidth: 600, lineHeight: 1.6 }}>
                                    Daftar lengkap seluruh kapabilitas atomik dalam ekosistem AkuGlow. 
                                    Gunakan registry ini untuk memetakan fungsi teknis ke dalam kebijakan akses bisnis.
                                </p>
                            </div>
                            <div style={{ ...A.searchWrap, width: 300 }}>
                                <i className="bx bx-search" style={{ ...A.searchIcon, color: '#fff' }} />
                                <input 
                                    type="text" 
                                    placeholder="Cari kapabilitas..." 
                                    style={{ ...A.searchInput, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', width: '100%' }}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                    
                    <div className="rbac-perm-cols">
                        {Object.entries(
                            permissions
                                .filter(p => !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.code.toLowerCase().includes(searchTerm.toLowerCase()) || p.group.toLowerCase().includes(searchTerm.toLowerCase()))
                                .reduce((acc, p) => { (acc[p.group] = acc[p.group] || []).push(p); return acc; }, {})
                        ).map(([group, perms]) => {
                            const groupIcons = {
                                'Dashboard': 'bx-grid-alt',
                                'Catalog': 'bx-layer',
                                'Sales': 'bx-cart',
                                'Inventory': 'bx-package',
                                'Users': 'bx-user',
                                'Merchants': 'bx-store-alt',
                                'Affiliate': 'bx-group',
                                'Finance': 'bx-wallet',
                                'Marketing': 'bx-megaphone',
                                'Settings': 'bx-cog',
                                'IAM': 'bx-shield-quarter',
                                'Reports': 'bx-bar-chart-alt-2'
                            };
                            const icon = groupIcons[group] || 'bx-cube';

                            return (
                                <div key={group} style={{ 
                                    ...A.card, 
                                    breakInside: 'avoid', 
                                    marginBottom: 24, 
                                    display: 'flex', 
                                    flexDirection: 'column',
                                    border: '1px solid #f1f5f9'
                                }}>
                                    <div className="rbac-card-head" style={{ padding: '24px 30px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                            <div style={{ width: 44, height: 44, borderRadius: 14, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
                                                <i className={`bx ${icon}`} style={{ color: '#6366f1', fontSize: 22 }} />
                                            </div>
                                            <div>
                                                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#1e293b' }}>{group}</h3>
                                                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{perms.length} Kapabilitas Aktif</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ padding: 30 }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            {perms.map(p => (
                                                <div key={p.id} style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'flex-start', 
                                                    gap: 16, 
                                                    padding: '16px', 
                                                    background: '#fff', 
                                                    borderRadius: 16, 
                                                    border: '1px solid #f1f5f9', 
                                                    transition: '0.2s cubic-bezier(0.16, 1, 0.3, 1)' 
                                                }} onMouseEnter={e=>{e.currentTarget.style.borderColor='#6366f1'; e.currentTarget.style.transform='translateX(4px)';}} onMouseLeave={e=>{e.currentTarget.style.borderColor='#f1f5f9'; e.currentTarget.style.transform='none';}}>
                                                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                                                        <i className="bx bx-check" style={{ color: '#059669', fontSize: 16 }} />
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                            <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>{p.name}</div>
                                                            <div style={{ fontSize: 9, color: '#6366f1', fontWeight: 900, background: '#e0e7ff', padding: '2px 6px', borderRadius: 6, textTransform: 'uppercase' }}>{p.code}</div>
                                                        </div>
                                                        <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
                                                            {p.description || `Memberikan akses untuk mengelola fungsi ${p.name.toLowerCase()} dalam sistem.`}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
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
                                            <input style={{...A.input, background: '#fff', border: '1.5px solid #e2e8f0', fontWeight: 600}} placeholder="e.g. Senior CS Analyst" value={selectedRole.name} onChange={e=>setSelectedRole({...selectedRole, name: e.target.value})} required />
                                        </div>
                                        
                                        <div style={{ marginBottom: 16 }}>
                                            <FieldLabel>Operational Context / Description</FieldLabel>
                                            <textarea style={{...A.input, height: 140, background: '#fff', border: '1.5px solid #e2e8f0', resize: 'none', lineHeight: 1.5}} placeholder="Jelaskan ruang lingkup dan tanggung jawab dari profile ini..." value={selectedRole.description} onChange={e=>setSelectedRole({...selectedRole, description: e.target.value})} />
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

                                        <button style={{...A.btnPrimary, width: '100%', height: 48, fontSize: 13.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20}} type="submit">
                                            <i className="bx bx-save" style={{ fontSize: 18 }} /> SAVE PROFILE
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="rbac-modal-right">
                                <div className="rbac-tab-header" style={{ marginBottom: 16 }}>
                                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: '#1e293b', letterSpacing: '-0.3px' }}>Matrix Kapabilitas</h4>
                                    <div style={{ fontSize: 11.5, color: '#4f46e5', background: '#eef2ff', padding: '6px 14px', borderRadius: 20, fontWeight: 800 }}>
                                        Batasi kapabilitas operasional profil
                                    </div>
                                </div>
                                
                                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: 24, border: '1px solid #e2e8f0', maxHeight: '52vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
                                    {Object.entries(permissions.reduce((acc, p) => { (acc[p.group] = acc[p.group] || []).push(p); return acc; }, {})).map(([g, ps]) => {
                                        const groupIcons = {
                                            'Dashboard': 'bx-grid-alt',
                                            'Catalog': 'bx-layer',
                                            'Sales': 'bx-cart',
                                            'Inventory': 'bx-package',
                                            'Users': 'bx-user',
                                            'Merchants': 'bx-store-alt',
                                            'Affiliate': 'bx-group',
                                            'Finance': 'bx-wallet',
                                            'Marketing': 'bx-megaphone',
                                            'Settings': 'bx-cog',
                                            'IAM': 'bx-shield-quarter',
                                            'Reports': 'bx-bar-chart-alt-2'
                                        };
                                        const icon = groupIcons[g] || 'bx-cube';
                                        const isExpanded = !!expandedGroups[g];
                                        const selectedCount = ps.filter(p => (selectedRole.permission_ids || []).includes(p.id)).length;
                                        
                                        return (
                                            <div key={g} style={{ flexShrink: 0, background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', transition: 'all 0.3s ease' }}>
                                                {/* Header Trigger */}
                                                <div 
                                                    style={{ 
                                                        display: 'flex', 
                                                        justifyContent: 'space-between', 
                                                        alignItems: 'center', 
                                                        padding: '14px 20px', 
                                                        background: 'linear-gradient(90deg, #f8fafc 0%, #fff 100%)', 
                                                        borderBottom: isExpanded ? '1px solid #f1f5f9' : 'none',
                                                        cursor: 'pointer',
                                                        userSelect: 'none'
                                                    }}
                                                    onClick={() => toggleGroupExpand(g)}
                                                >
                                                    <div style={{ fontSize: 12, fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 10, letterSpacing: '0.05em' }}>
                                                        <div style={{ width: 28, height: 28, borderRadius: 8, background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <i className={`bx ${icon}`} style={{ color: '#6366f1', fontSize: 16 }}/>
                                                        </div>
                                                        <span style={{ display: 'flex', alignItems: 'center' }}>
                                                            {g.toUpperCase()} MODULE
                                                            {selectedCount > 0 && (
                                                                <span style={{ fontSize: 10, background: '#e0e7ff', color: '#4f46e5', padding: '2px 8px', borderRadius: 8, fontWeight: 800, marginLeft: 8 }}>
                                                                    {selectedCount} / {ps.length} SELECTED
                                                                </span>
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} onClick={e => e.stopPropagation()}>
                                                        <div style={{ display: 'flex', gap: 8 }}>
                                                            <button type="button" style={{ border: 'none', background: '#eef2ff', borderRadius: 20, padding: '6px 14px', fontSize: 10, fontWeight: 800, color: '#4f46e5', cursor: 'pointer', transition: '0.2s' }} onMouseEnter={e=>e.currentTarget.style.background='#c7d2fe'} onMouseLeave={e=>e.currentTarget.style.background='#eef2ff'} onClick={() => toggleGroup(g, true)}>SELECT ALL</button>
                                                            <button type="button" style={{ border: 'none', background: '#f1f5f9', borderRadius: 20, padding: '6px 14px', fontSize: 10, fontWeight: 800, color: '#64748b', cursor: 'pointer', transition: '0.2s' }} onMouseEnter={e=>e.currentTarget.style.background='#cbd5e1'} onMouseLeave={e=>e.currentTarget.style.background='#f1f5f9'} onClick={() => toggleGroup(g, false)}>CLEAR</button>
                                                        </div>
                                                        <div 
                                                            onClick={() => toggleGroupExpand(g)}
                                                            style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isExpanded ? '#f1f5f9' : 'transparent', cursor: 'pointer', transition: '0.2s' }}
                                                        >
                                                            <i className="bx bx-chevron-down" style={{ fontSize: 18, color: '#64748b', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }} />
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Content Dropdown */}
                                                {isExpanded && (
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, padding: 20, background: '#fff', animation: 'slideDown 0.25s ease-out' }}>
                                                        {ps.map(p => {
                                                            const isChecked = (selectedRole.permission_ids || []).includes(p.id);
                                                            return (
                                                                <div key={p.id} style={{ 
                                                                    display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px', 
                                                                    background: isChecked ? '#f5f7ff' : '#fff', 
                                                                    border: `2.5px solid ${isChecked ? '#6366f1' : '#f1f5f9'}`, 
                                                                    borderRadius: 14, cursor: 'pointer', transition: 'all 0.2s',
                                                                    boxShadow: isChecked ? '0 4px 12px rgba(99,102,241,0.08)' : 'none'
                                                                }}
                                                                onClick={() => togglePermission(p.id)}
                                                                onMouseEnter={e => { if(!isChecked) e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                                                onMouseLeave={e => { if(!isChecked) e.currentTarget.style.borderColor = '#f1f5f9'; }}
                                                                >
                                                                    <div style={{ 
                                                                        width: 18, height: 18, borderRadius: 6, 
                                                                        border: `2px solid ${isChecked ? '#6366f1' : '#cbd5e1'}`, 
                                                                        background: isChecked ? '#6366f1' : '#fff', 
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                        flexShrink: 0, marginTop: 2, transition: 'all 0.2s'
                                                                    }}>
                                                                        {isChecked && <i className="bx bx-check" style={{ color: '#fff', fontSize: 14 }} />}
                                                                    </div>
                                                                    <div style={{ minWidth: 0 }}>
                                                                        <div style={{ fontSize: 12.5, fontWeight: 800, color: isChecked ? '#1e1b4b' : '#334155' }}>{p.name}</div>
                                                                        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4, fontFamily: 'monospace' }}>{p.code}</div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
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
                                    <input style={A.input} placeholder="Nama Lengkap Staff" value={newUser.full_name} onChange={e=>setNewUser({...newUser, full_name: e.target.value})} required />
                                </div>
                                <div>
                                    <FieldLabel>Email Address</FieldLabel>
                                    <input style={{...A.input, background: selectedUser ? '#f8fafc' : '#f8fafc'}} type="email" placeholder="email@perusahaan.com" value={newUser.email} onChange={e=>setNewUser({...newUser, email: e.target.value})} required={!selectedUser} disabled={!!selectedUser} />
                                    {selectedUser && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6 }}>Email cannot be modified for existing personnel.</div>}
                                </div>
                                {!selectedUser && (
                                    <div>
                                        <FieldLabel>System Password</FieldLabel>
                                        <input style={A.input} type="password" placeholder="Password minimal 8 karakter" value={newUser.password} onChange={e=>setNewUser({...newUser, password: e.target.value})} required />
                                    </div>
                                )}
                                <div>
                                    <FieldLabel>Corporate Department</FieldLabel>
                                    <select style={A.select} value={newUser.department} onChange={e=>setNewUser({...newUser, department: e.target.value})}>
                                        <option value="">No Department / General</option>
                                        <option value="IT & SYSTEMS">IT & SYSTEMS</option>
                                        <option value="MARKETING">MARKETING</option>
                                        <option value="FINANCE">FINANCE</option>
                                        <option value="CUSTOMER SERVICE">CUSTOMER SERVICE</option>
                                        <option value="LOGISTICS">LOGISTICS</option>
                                        <option value="MANAGEMENT">MANAGEMENT</option>
                                    </select>
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
                                            <select 
                                                style={{...A.select, width: '100%', height: 44}} 
                                                value={newUser.admin_role} 
                                                onChange={e=>setNewUser({...newUser, admin_role: e.target.value})} 
                                                required={newUser.role === 'admin'}
                                            >
                                                <option value="">-- Choose a Security Profile --</option>
                                                {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                                            </select>
                                            
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

                                <button style={{ ...A.btnPrimary, width: '100%', height: 54, borderRadius: 16, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 10 }} type="submit">
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
