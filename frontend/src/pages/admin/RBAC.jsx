import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';
import { A, PageHeader, TablePanel, Modal, FieldLabel } from '../../lib/adminStyles.jsx';
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
    
    const initialUserState = { email: '', password: '', full_name: '', role: 'admin', admin_role: '', department: '' };
    const [newUser, setNewUser] = useState(initialUserState);

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
        <div style={{ ...A.page, maxWidth: 1400, margin: '0 auto' }}>
            <PageHeader title="IDENTITY & ACCESS MANAGEMENT" subtitle="Kontrol granular otoritas sistem dan manajemen staf tingkat enterprise">
                <div style={{ display: 'flex', gap: 6 }}>
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
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>
                        <div style={{ ...A.card, padding: 24, borderTop: '4px solid #6366f1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Security Profiles</div>
                                <div style={{ fontSize: 36, fontWeight: 900, color: '#0f172a', marginTop: 8 }}>{stats.total_roles}</div>
                            </div>
                            <div style={{ width: 60, height: 60, borderRadius: 16, background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="bx bx-shield-quarter" style={{ fontSize: 32, color: '#6366f1' }} />
                            </div>
                        </div>
                        <div style={{ ...A.card, padding: 24, borderTop: '4px solid #10b981', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Active Personnel</div>
                                <div style={{ fontSize: 36, fontWeight: 900, color: '#0f172a', marginTop: 8 }}>{stats.active_admins}</div>
                            </div>
                            <div style={{ width: 60, height: 60, borderRadius: 16, background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="bx bx-user-check" style={{ fontSize: 32, color: '#10b981' }} />
                            </div>
                        </div>
                        <div style={{ ...A.card, padding: 24, borderTop: '4px solid #f59e0b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>System Capabilities</div>
                                <div style={{ fontSize: 36, fontWeight: 900, color: '#0f172a', marginTop: 8 }}>{stats.total_perms}</div>
                            </div>
                            <div style={{ width: 60, height: 60, borderRadius: 16, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="bx bx-slider-alt" style={{ fontSize: 32, color: '#f59e0b' }} />
                            </div>
                        </div>
                        <div style={{ ...A.card, padding: 24, borderTop: '4px solid #8b5cf6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Recent Logins (7d)</div>
                                <div style={{ fontSize: 36, fontWeight: 900, color: '#0f172a', marginTop: 8 }}>{stats.recent_logins}</div>
                            </div>
                            <div style={{ width: 60, height: 60, borderRadius: 16, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="bx bx-log-in-circle" style={{ fontSize: 32, color: '#8b5cf6' }} />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                        <div style={{ ...A.card, padding: 24 }}>
                            <h3 style={{ margin: '0 0 20px 0', fontSize: 15, fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <i className="bx bx-buildings" style={{ color: '#6366f1', fontSize: 20 }} /> STAFF BY DEPARTMENT
                            </h3>
                            {stats.dept_stats?.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {stats.dept_stats.map(ds => (
                                        <div key={ds.department || 'Unassigned'} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 140, fontSize: 13, fontWeight: 700, color: '#475569' }}>{ds.department || 'Unassigned'}</div>
                                            <div style={{ flex: 1, height: 12, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden' }}>
                                                <div style={{ width: `${(ds.count / Math.max(1, stats.active_admins + stats.inactive_admins)) * 100}%`, height: '100%', background: '#6366f1', borderRadius: 6 }} />
                                            </div>
                                            <div style={{ width: 30, textAlign: 'right', fontSize: 12, fontWeight: 800 }}>{ds.count}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No department data available</div>
                            )}
                        </div>

                        <div style={{ ...A.card, padding: 24 }}>
                            <h3 style={{ margin: '0 0 20px 0', fontSize: 15, fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <i className="bx bx-id-card" style={{ color: '#10b981', fontSize: 20 }} /> STAFF BY ROLE
                            </h3>
                            {stats.role_stats?.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {stats.role_stats.map(rs => (
                                        <div key={rs.admin_role || 'No Role'} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 140, fontSize: 13, fontWeight: 700, color: '#475569' }}>{rs.admin_role || 'No Role'}</div>
                                            <div style={{ flex: 1, height: 12, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden' }}>
                                                <div style={{ width: `${(rs.count / Math.max(1, stats.active_admins + stats.inactive_admins)) * 100}%`, height: '100%', background: '#10b981', borderRadius: 6 }} />
                                            </div>
                                            <div style={{ width: 30, textAlign: 'right', fontSize: 12, fontWeight: 800 }}>{rs.count}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No role data available</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- PERSONNEL TAB --- */}
            {activeTab === 'personnel' && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', background: '#fff', padding: 16, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <i className="bx bx-search" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 20 }} />
                            <input 
                                style={{ ...A.input, paddingLeft: 44, margin: 0 }} 
                                placeholder="Cari berdasarkan nama atau email..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select style={{ ...A.select, width: 200, margin: 0 }} value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)}>
                            <option value="">Semua Departemen</option>
                            <option value="IT & SYSTEMS">IT & SYSTEMS</option>
                            <option value="MARKETING">MARKETING</option>
                            <option value="FINANCE">FINANCE</option>
                            <option value="CUSTOMER SERVICE">CUSTOMER SERVICE</option>
                            <option value="LOGISTICS">LOGISTICS</option>
                        </select>
                        <select style={{ ...A.select, width: 160, margin: 0 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                            <option value="">Semua Status</option>
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                        </select>
                        <button style={{ ...A.btnPrimary, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => { setSelectedUser(null); setNewUser(initialUserState); setShowUserModal(true); }}>
                            <i className="bx bx-user-plus" style={{ fontSize: 18 }} /> Onboard Staff
                        </button>
                    </div>

                    <TablePanel loading={loading}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={{ ...A.th, paddingLeft: 24 }}>Personnel Details</th>
                                    <th style={A.th}>Department</th>
                                    <th style={A.th}>Security Profile</th>
                                    <th style={A.th}>Access Level</th>
                                    <th style={A.th}>Status & Activity</th>
                                    <th style={{ ...A.th, textAlign: 'right', paddingRight: 24 }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {admins.map(user => (
                                    <tr key={user.id} style={{ ...A.tr, transition: 'all 0.2s' }}>
                                        <td style={{ ...A.td, paddingLeft: 24 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', fontSize: 18, fontWeight: 800 }}>
                                                    {(user.profile?.full_name || 'U')[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 800, color: '#1e293b', fontSize: 14 }}>{user.profile?.full_name}</div>
                                                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={A.td}>
                                            <div style={{ fontWeight: 700, color: '#334155' }}>{user.department || 'Unassigned'}</div>
                                        </td>
                                        <td style={A.td}>
                                            <div style={{ fontSize: 13, color: '#6366f1', fontWeight: 800 }}>
                                                {user.role === 'superadmin' ? (
                                                    <span style={{ color: '#94a3b8', fontWeight: 600, fontSize: 11 }}>SYSTEM CONTROL ACCESS</span>
                                                ) : (
                                                    user.admin_role || 'No Profile Assigned'
                                                )}
                                            </div>
                                        </td>
                                        <td style={A.td}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ 
                                                    padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                                                    background: user.role === 'superadmin' ? '#fef2f2' : '#f0fdf4',
                                                    color: user.role === 'superadmin' ? '#ef4444' : '#16a34a',
                                                    border: `1px solid ${user.role === 'superadmin' ? '#fecaca' : '#bbf7d0'}`
                                                }}>
                                                    {user.role}
                                                </span>
                                                <button 
                                                    style={{ border: 'none', background: '#f1f5f9', width: 26, height: 26, borderRadius: '50%', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} 
                                                    onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#334155'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
                                                    onClick={() => setPreviewUser(user)}
                                                    title="View Permissions"
                                                >
                                                    <i className="bx bx-shield-quarter" />
                                                </button>
                                            </div>
                                        </td>
                                        <td style={A.td}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: user.status === 'active' ? '#10b981' : '#f43f5e' }} />
                                                <span style={{ fontSize: 12, fontWeight: 700, color: user.status === 'active' ? '#10b981' : '#f43f5e', textTransform: 'capitalize' }}>
                                                    {user.status}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: 11, color: '#94a3b8' }}>Login: {formatDate(user.last_login_at)}</div>
                                        </td>
                                        <td style={{ ...A.td, textAlign: 'right', paddingRight: 24 }}>
                                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                <button style={{...A.iconBtn('#6366f1'), background: '#f8fafc', border: '1px solid #e2e8f0'}} onClick={() => handleEditUser(user)} title="Edit Profile">
                                                    <i className="bx bx-edit-alt" />
                                                </button>
                                                <button style={{...A.iconBtn(user.status === 'active' ? '#f59e0b' : '#10b981'), background: '#f8fafc', border: '1px solid #e2e8f0'}} onClick={() => handleToggleStatus(user.id, user.status)} title={user.status === 'active' ? 'Suspend' : 'Activate'}>
                                                    <i className={`bx ${user.status === 'active' ? 'bx-block' : 'bx-check-circle'}`} />
                                                </button>
                                                <button style={{...A.iconBtn('#ef4444'), background: '#f8fafc', border: '1px solid #e2e8f0'}} onClick={() => handleDeleteUser(user.id)} title="Delete Staff">
                                                    <i className="bx bx-trash" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {admins.length === 0 && (
                                    <tr>
                                        <td colSpan="6" style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                                            <i className="bx bx-user-x" style={{ fontSize: 48, marginBottom: 16, color: '#cbd5e1', display: 'block' }} />
                                            Tidak ada personel yang ditemukan
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
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
                        <button style={{ ...A.btnPrimary, display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => { setSelectedRole({ name: '', description: '', permission_ids: [] }); setShowRoleModal(true); }}>
                            <i className="bx bx-plus-circle" style={{ fontSize: 18 }} /> Create Security Profile
                        </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
                        {roles.map(role => (
                            <div key={role.id} style={{ ...A.card, borderTop: '4px solid #6366f1', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ padding: 24, flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#1e293b' }}>{role.name}</h3>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button style={{...A.iconBtn('#10b981'), background: '#f0fdf4'}} onClick={() => handleCloneRole(role)} title="Clone Profile"><i className="bx bx-copy" /></button>
                                            <button style={{...A.iconBtn('#6366f1'), background: '#eef2ff'}} onClick={() => { setSelectedRole({...role, permission_ids: role.permissions.map(p=>p.id)}); setShowRoleModal(true); }}><i className="bx bx-edit-alt" /></button>
                                            <button style={{...A.iconBtn('#ef4444'), background: '#fef2f2'}} onClick={() => handleDeleteRole(role.id)} title="Delete Profile"><i className="bx bx-trash" /></button>
                                        </div>
                                    </div>
                                    <p style={{ margin: '0 0 20px 0', fontSize: 13, color: '#64748b', lineHeight: 1.5, minHeight: 40 }}>{role.description || 'Tidak ada deskripsi'}</p>
                                    
                                    <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                            <span style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Assigned Permissions</span>
                                            <span style={{ background: '#e0e7ff', color: '#4f46e5', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 800 }}>{role.permissions?.length || 0}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {role.permissions?.slice(0, 8).map(p => (
                                                <span key={p.id} style={{ background: '#fff', border: '1px solid #e2e8f0', color: '#334155', padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600 }}>
                                                    {p.name}
                                                </span>
                                            ))}
                                            {role.permissions?.length > 8 && (
                                                <span style={{ background: '#f1f5f9', color: '#64748b', padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700 }}>
                                                    +{role.permissions.length - 8} more
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', borderBottomLeftRadius: 16, borderBottomRightRadius: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Used by <strong style={{ color: '#0f172a' }}>{stats.role_stats?.find(rs => rs.admin_role === role.name)?.count || 0}</strong> personnel</span>
                                    <span style={{ fontSize: 11, color: '#94a3b8' }}>Updated {formatDate(role.updated_at).split(',')[0]}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- PERMISSIONS TAB --- */}
            {activeTab === 'permissions' && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
                        {Object.entries(permissions.reduce((acc, p) => { (acc[p.group] = acc[p.group] || []).push(p); return acc; }, {})).map(([group, perms]) => (
                            <div key={group} style={{ ...A.card, flex: '1 1 400px', padding: 0, overflow: 'hidden' }}>
                                <div style={{ padding: '16px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <i className="bx bx-layer" style={{ color: '#4f46e5', fontSize: 18 }} />
                                    </div>
                                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#1e293b' }}>{group} Module</h3>
                                    <span style={{ marginLeft: 'auto', background: '#fff', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 800, color: '#64748b' }}>
                                        {perms.length} Functions
                                    </span>
                                </div>
                                <div style={{ padding: 24 }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                                        {perms.map(p => (
                                            <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                                                <i className="bx bx-check-shield" style={{ color: '#10b981', fontSize: 18, marginTop: 2 }} />
                                                <div>
                                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{p.name}</div>
                                                    <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace', marginTop: 4, background: '#e2e8f0', padding: '2px 6px', borderRadius: 4, display: 'inline-block' }}>{p.code}</div>
                                                    {p.description && <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>{p.description}</div>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
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
                        <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: 32 }}>
                            <div>
                                <div style={{ background: '#f8fafc', padding: 24, borderRadius: 16, border: '1px solid #e2e8f0' }}>
                                    <h4 style={{ margin: '0 0 20px 0', fontSize: 14, fontWeight: 800, color: '#1e293b' }}>Detail Profile</h4>
                                    <FieldLabel>Profile Name</FieldLabel>
                                    <input style={{...A.input, marginBottom: 16, background: '#fff'}} placeholder="e.g. Senior CS Analyst" value={selectedRole.name} onChange={e=>setSelectedRole({...selectedRole, name: e.target.value})} required />
                                    
                                    <FieldLabel>Operational Context / Description</FieldLabel>
                                    <textarea style={{...A.input, height: 120, background: '#fff'}} placeholder="Jelaskan ruang lingkup dan tanggung jawab dari profile ini..." value={selectedRole.description} onChange={e=>setSelectedRole({...selectedRole, description: e.target.value})} />
                                    
                                    <div style={{ marginTop: 24, padding: 16, background: '#e0e7ff', borderRadius: 12, border: '1px dashed #a5b4fc' }}>
                                        <div style={{ fontSize: 12, fontWeight: 800, color: '#4338ca', marginBottom: 8 }}>Status Sinkronisasi</div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: 11, color: '#4f46e5' }}>Total Izin Terpilih:</span>
                                            <span style={{ fontSize: 18, fontWeight: 900, color: '#312e81' }}>{(selectedRole.permission_ids || []).length}</span>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                                    <button style={{...A.btnPrimary, flex: 1, height: 48, fontSize: 13}} type="submit">
                                        <i className="bx bx-save" style={{ marginRight: 8, fontSize: 18 }} /> SAVE PROFILE
                                    </button>
                                </div>
                            </div>
                            
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#1e293b' }}>Matrix Kapabilitas</h4>
                                    <div style={{ fontSize: 12, color: '#64748b', background: '#f1f5f9', padding: '6px 12px', borderRadius: 20 }}>
                                        Pilih fungsi yang diizinkan untuk role ini
                                    </div>
                                </div>
                                
                                <div style={{ background: '#f8fafc', padding: 24, borderRadius: 16, border: '1px solid #e2e8f0', maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}>
                                    {Object.entries(permissions.reduce((acc, p) => { (acc[p.group] = acc[p.group] || []).push(p); return acc; }, {})).map(([g, ps]) => (
                                        <div key={g} style={{ marginBottom: 28, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                                                <div style={{ fontSize: 13, fontWeight: 900, color: '#334155', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <i className="bx bx-folder" style={{ color: '#64748b' }}/> {g.toUpperCase()}
                                                </div>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button type="button" style={{ border: '1px solid #cbd5e1', background: '#fff', borderRadius: 6, padding: '4px 10px', fontSize: 10, fontWeight: 800, color: '#4f46e5', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => toggleGroup(g, true)} onMouseEnter={e=>e.currentTarget.style.background='#eef2ff'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>SELECT ALL</button>
                                                    <button type="button" style={{ border: '1px solid #cbd5e1', background: '#fff', borderRadius: 6, padding: '4px 10px', fontSize: 10, fontWeight: 800, color: '#64748b', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => toggleGroup(g, false)} onMouseEnter={e=>e.currentTarget.style.background='#f1f5f9'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>CLEAR</button>
                                                </div>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, padding: 20 }}>
                                                {ps.map(p => {
                                                    const isChecked = (selectedRole.permission_ids || []).includes(p.id);
                                                    return (
                                                        <label key={p.id} style={{ 
                                                            display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px', 
                                                            background: isChecked ? '#eef2ff' : '#fff', 
                                                            border: `1px solid ${isChecked ? '#818cf8' : '#e2e8f0'}`, 
                                                            borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s',
                                                            boxShadow: isChecked ? '0 2px 4px rgba(99,102,241,0.1)' : 'none'
                                                        }}
                                                        onMouseEnter={e => { if(!isChecked) e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                                        onMouseLeave={e => { if(!isChecked) e.currentTarget.style.borderColor = '#e2e8f0'; }}>
                                                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 6, border: `2px solid ${isChecked ? '#6366f1' : '#cbd5e1'}`, background: isChecked ? '#6366f1' : '#fff', flexShrink: 0, marginTop: 2 }}>
                                                                {isChecked && <i className="bx bx-check" style={{ color: '#fff', fontSize: 16, position: 'absolute' }} />}
                                                                <input type="checkbox" style={{ opacity: 0, position: 'absolute', width: '100%', height: '100%', cursor: 'pointer' }} checked={isChecked} onChange={() => togglePermission(p.id)} />
                                                            </div>
                                                            <div>
                                                                <div style={{ fontSize: 12, fontWeight: 700, color: isChecked ? '#312e81' : '#334155' }}>{p.name}</div>
                                                                {p.description && <div style={{ fontSize: 10, color: '#64748b', marginTop: 4, lineHeight: 1.4 }}>{p.description}</div>}
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </form>
                </Modal>
            )}

            {/* User Onboarding Modal */}
            {showUserModal && (
                <Modal title={selectedUser ? "UPDATE PERSONNEL PROFILE" : "SYSTEM PERSONNEL ONBOARDING"} onClose={() => { setShowUserModal(false); setSelectedUser(null); }}>
                    <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 8 }}>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                            <div>
                                <FieldLabel>Full Name</FieldLabel>
                                <div style={{ position: 'relative' }}>
                                    <i className="bx bx-user" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 18 }} />
                                    <input style={{...A.input, paddingLeft: 42}} placeholder="Nama Lengkap Staff" value={newUser.full_name} onChange={e=>setNewUser({...newUser, full_name: e.target.value})} required />
                                </div>
                            </div>
                            <div>
                                <FieldLabel>Email Address</FieldLabel>
                                <div style={{ position: 'relative' }}>
                                    <i className="bx bx-envelope" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 18 }} />
                                    <input style={{...A.input, paddingLeft: 42}} type="email" placeholder="email@perusahaan.com" value={newUser.email} onChange={e=>setNewUser({...newUser, email: e.target.value})} required={!selectedUser} disabled={!!selectedUser} />
                                </div>
                                {selectedUser && <div style={{ fontSize: 10, color: '#64748b', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}><i className="bx bx-info-circle"/> Email cannot be changed</div>}
                            </div>
                        </div>

                        {!selectedUser && (
                            <div>
                                <FieldLabel>System Password</FieldLabel>
                                <div style={{ position: 'relative' }}>
                                    <i className="bx bx-lock-alt" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 18 }} />
                                    <input style={{...A.input, paddingLeft: 42}} type="password" placeholder="Password minimal 8 karakter" value={newUser.password} onChange={e=>setNewUser({...newUser, password: e.target.value})} required />
                                </div>
                            </div>
                        )}

                        <div style={{ height: 1, background: '#e2e8f0', margin: '8px 0' }} />
                        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <i className="bx bx-shield-quarter" style={{ color: '#6366f1' }} /> Placement & Authorization
                        </h4>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                            <div>
                                <FieldLabel>Corporate Department</FieldLabel>
                                <div style={{ position: 'relative' }}>
                                    <i className="bx bx-buildings" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 18 }} />
                                    <select style={{...A.select, paddingLeft: 42}} value={newUser.department} onChange={e=>setNewUser({...newUser, department: e.target.value})}>
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
                            <div>
                                <FieldLabel>Privilege Level</FieldLabel>
                                <div style={{ position: 'relative' }}>
                                    <i className="bx bx-key" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 18 }} />
                                    <select style={{...A.select, paddingLeft: 42, background: newUser.role === 'superadmin' ? '#fef2f2' : '#fff', borderColor: newUser.role === 'superadmin' ? '#fecaca' : '#e2e8f0'}} value={newUser.role} onChange={e=>setNewUser({...newUser, role: e.target.value})}>
                                        <option value="admin">Admin (Restricted Access)</option>
                                        <option value="superadmin">Superadmin (Root Access)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', opacity: newUser.role === 'superadmin' ? 0.6 : 1 }}>
                            <FieldLabel>Security Profile Assignment {newUser.role === 'superadmin' && '(Not Required for Superadmin)'}</FieldLabel>
                            <select 
                                style={{...A.select, background: newUser.role === 'superadmin' ? '#f1f5f9' : '#fff'}} 
                                value={newUser.admin_role} 
                                onChange={e=>setNewUser({...newUser, admin_role: e.target.value})} 
                                disabled={newUser.role === 'superadmin'}
                                required={newUser.role !== 'superadmin'}
                            >
                                <option value="">-- {roles.length === 0 ? 'No Profiles Available' : 'Assign a security profile'} --</option>
                                {Array.isArray(roles) && roles.map(r => (
                                    <option key={r.id} value={r.name}>{r.name}</option>
                                ))}
                            </select>

                            {newUser.role === 'superadmin' ? (
                                <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', color: '#ef4444', fontSize: 11, fontWeight: 700 }}>
                                    <i className="bx bxs-check-shield" /> SUPERADMIN: Akses penuh diberikan secara otomatis.
                                </div>
                            ) : (
                                <>
                                    {newUser.admin_role ? (
                                        <div style={{ marginTop: 16 }}>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase' }}>Profile Capabilities Preview</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                {getAdminPermissions(newUser.admin_role).slice(0, 5).map(p => (
                                                    <span key={p.id} style={{ fontSize: 10, background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>{p.name}</span>
                                                ))}
                                                {getAdminPermissions(newUser.admin_role).length > 5 && (
                                                    <span style={{ fontSize: 10, background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>+{getAdminPermissions(newUser.admin_role).length - 5} more</span>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        roles.length === 0 && (
                                            <div style={{ marginTop: 12, background: '#fff1f2', padding: 10, borderRadius: 8, border: '1px solid #fecaca', display: 'flex', gap: 8, alignItems: 'center' }}>
                                                <i className="bx bx-error-circle" style={{ color: '#ef4444' }} />
                                                <div style={{ fontSize: 11, color: '#991b1b', fontWeight: 600 }}>
                                                    Belum ada Security Profile. Silakan buat di tab <strong>ROLES</strong> terlebih dahulu.
                                                </div>
                                            </div>
                                        )
                                    )}
                                </>
                            )}
                        </div>


                        <div style={{ marginTop: 12 }}>
                            <button style={{ ...A.btnPrimary, width: '100%', height: 48, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }} type="submit">
                                <i className="bx bx-check-shield" style={{ fontSize: 20 }} /> 
                                {selectedUser ? 'UPDATE PERSONNEL PROFILE' : 'SYNCHRONIZE PERSONNEL ACCESS'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default AdminRBAC;
