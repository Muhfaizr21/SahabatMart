import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';
import { A, PageHeader, TablePanel, Modal, FieldLabel, fmtDate } from '../../lib/adminStyles.jsx';
import toast from 'react-hot-toast';

const AdminRBAC = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [summary, setSummary] = useState({ total_roles: 0, active_admins: 0, total_perms: 0 });

    const [showRoleModal, setShowRoleModal] = useState(false);
    const [showUserModal, setShowUserModal] = useState(false);
    const [previewUser, setPreviewUser] = useState(null);
    const [selectedRole, setSelectedRole] = useState(null);
    const [newUser, setNewUser] = useState({ email: '', password: '', full_name: '', role: 'admin', admin_role: '', department: '' });

    const loadData = () => {
        setLoading(true);
        Promise.all([
            fetchJson(`${ADMIN_API_BASE}/rbac/roles`),
            fetchJson(`${ADMIN_API_BASE}/rbac/permissions`),
            fetchJson(`${ADMIN_API_BASE}/users?role=admin`)
        ]).then(([r, p, u]) => {
            setRoles(r || []);
            setPermissions(p || []);
            setAdmins(u.data || []);
            setSummary({
                total_roles: r.length,
                active_admins: u.data?.filter(a => a.status === 'active').length || 0,
                total_perms: p.length
            });
        }).finally(() => setLoading(false));
    };

    useEffect(() => { loadData(); }, []);

    const handleSaveRole = (e) => {
        e.preventDefault();
        fetchJson(`${ADMIN_API_BASE}/rbac/roles/upsert`, {
            method: 'POST',
            body: JSON.stringify(selectedRole)
        }).then(() => {
            toast.success('Role synchronized successfully');
            setShowRoleModal(false);
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

    const handleCreateUser = (e) => {
        e.preventDefault();
        fetchJson(`${ADMIN_API_BASE}/rbac/users`, {
            method: 'POST',
            body: JSON.stringify(newUser)
        }).then(() => {
            toast.success('Admin profile synchronized 100%');
            setShowUserModal(false);
            setNewUser({ email: '', password: '', full_name: '', role: 'admin', admin_role: '', department: '' });
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
        const role = roles.find(r => r.name === adminRoleName);
        return role ? role.permissions : [];
    };

    return (
        <div style={A.page}>
            <PageHeader title="INTEGRATED RBAC SYSTEM" subtitle="Sinkronisasi 100% Otoritas & Keamanan Data Staff">
                <div style={{ display: 'flex', gap: 6 }}>
                    {['dashboard', 'users', 'roles', 'perms'].map(t => (
                        <button key={t} style={A.tab(activeTab === t)} onClick={() => setActiveTab(t)}>{t.toUpperCase()}</button>
                    ))}
                </div>
            </PageHeader>

            {activeTab === 'dashboard' && (
                <div style={{ animation: 'fadeIn 0.2s ease' }}>
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
                        gap: 16, 
                        marginBottom: 20 
                    }}>
                        <div style={{ ...A.card, padding: 20, borderTop: '3px solid #6366f1' }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Security Profiles</div>
                            <div style={{ fontSize: 28, fontWeight: 900 }}>{summary.total_roles} Roles</div>
                        </div>
                        <div style={{ ...A.card, padding: 20, borderTop: '3px solid #10b981' }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Verified Personnel</div>
                            <div style={{ fontSize: 28, fontWeight: 900 }}>{admins.length} Staff</div>
                        </div>
                        <div style={{ ...A.card, padding: 20, borderTop: '3px solid #f59e0b' }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>System Capabilities</div>
                            <div style={{ fontSize: 28, fontWeight: 900 }}>{summary.total_perms} Perimssions</div>
                        </div>
                    </div>

                    <div style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap',
                        gap: 16 
                    }}>
                        <div style={{ ...A.card, flex: '1 1 500px' }}>
                            <h3 style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 900 }}>OTORITAS CEPAT</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                                <button onClick={() => setShowUserModal(true)} style={{ ...A.btnPrimary, height: 80, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <i className="bx bx-user-plus" style={{ fontSize: 24 }} /> TAMBAH USER RBAC
                                </button>
                                <button onClick={() => { setSelectedRole({ name: '', description: '', permission_ids: [] }); setShowRoleModal(true); }} style={{ ...A.btnPrimary, background: '#1e293b', height: 80, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <i className="bx bx-lock-open" style={{ fontSize: 24 }} /> DESAIN ROLE BARU
                                </button>
                            </div>
                        </div>
                        <div style={{ ...A.card, flex: '1 1 300px' }}>
                            <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 900 }}>LOG AKTIVITAS TERBARU</h3>
                            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                                {admins.slice(0, 5).map(a => (
                                    <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                                        <div style={{ fontSize: 11, fontWeight: 700 }}>{a.profile?.full_name} <span style={{ color: '#94a3b8', fontWeight: 500 }}>- {a.admin_role}</span></div>
                                        <div style={{ fontSize: 10, color: '#10b981' }}>Synchronized</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'users' && (
                <div style={{ overflowX: 'auto' }}>
                    <TablePanel loading={loading} toolbar={<button style={A.btnPrimary} onClick={() => setShowUserModal(true)}>+ Onboard Admin Profile</button>}>
                        <div style={{ minWidth: 800 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th style={{ ...A.th, paddingLeft: 20 }}>Personnel</th>
                                        <th style={A.th}>Department</th>
                                        <th style={A.th}>RBAC Sync</th>
                                        <th style={A.th}>Status</th>
                                        <th style={{ ...A.th, textAlign: 'right', paddingRight: 20 }}>Control</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {admins.map(user => (
                                        <tr key={user.id} style={A.tr}>
                                            <td style={{ ...A.td, paddingLeft: 20 }}>
                                                <div style={{ fontWeight: 800 }}>{user.profile?.full_name}</div>
                                                <div style={{ fontSize: 10, color: '#94a3b8' }}>{user.email}</div>
                                            </td>
                                            <td style={A.td}><span style={{ fontSize: 10, padding: '2px 8px', background: '#f1f5f9', borderRadius: 4, fontWeight: 700 }}>{user.department || 'GENERAL'}</span></td>
                                            <td style={A.td}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <div style={{ fontSize: 11, fontWeight: 800, color: '#4f46e5' }}>{user.admin_role || 'STAFF'}</div>
                                                    <button style={{ border: 'none', background: 'transparent', color: '#6366f1', cursor: 'pointer', fontSize: 12 }} onClick={() => setPreviewUser(user)}><i className="bx bxs-help-circle" /></button>
                                                </div>
                                            </td>
                                            <td style={A.td}>
                                                <div style={{ fontSize: 9, fontWeight: 900, color: user.status === 'active' ? '#10b981' : '#ef4444' }}>● {user.status.toUpperCase()}</div>
                                            </td>
                                            <td style={{ ...A.td, textAlign: 'right', paddingRight: 20 }}>
                                                <button style={A.iconBtn('#6366f1')} onClick={() => setPreviewUser(user)}><i className="bx bx-show" /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </TablePanel>
                </div>
            )}

            {activeTab === 'roles' && (
                <TablePanel loading={loading} toolbar={<button style={A.btnPrimary} onClick={() => { setSelectedRole({ name: '', description: '', permission_ids: [] }); setShowRoleModal(true); }}>+ New Security Profile</button>}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ ...A.th, paddingLeft: 20 }}>Security Profile</th>
                                <th style={A.th}>Capabilities</th>
                                <th style={A.th}>Impact</th>
                                <th style={{ ...A.th, textAlign: 'right', paddingRight: 20 }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {roles.map(role => (
                                <tr key={role.id} style={A.tr}>
                                    <td style={{ ...A.td, paddingLeft: 20 }}>
                                        <div style={{ fontWeight: 800 }}>{role.name}</div>
                                        <div style={{ fontSize: 10, color: '#94a3b8' }}>{role.description}</div>
                                    </td>
                                    <td style={A.td}>{role.permissions?.length || 0} Permissions</td>
                                    <td style={A.td}>{admins.filter(a => a.admin_role === role.name).length} Accounts Affected</td>
                                    <td style={{ ...A.td, textAlign: 'right', paddingRight: 20 }}>
                                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                            <button style={A.iconBtn('#10b981')} onClick={() => handleCloneRole(role)} title="Clone Profile"><i className="bx bx-copy" /></button>
                                            <button style={A.iconBtn('#6366f1')} onClick={() => { setSelectedRole({...role, permission_ids: role.permissions.map(p=>p.id)}); setShowRoleModal(true); }}><i className="bx bx-edit-alt" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </TablePanel>
            )}

            {activeTab === 'perms' && (
                <TablePanel loading={loading}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ ...A.th, paddingLeft: 20 }}>Capability Module</th>
                                <th style={A.th}>Function Name</th>
                                <th style={A.th}>System Mapping</th>
                            </tr>
                        </thead>
                        <tbody>
                            {permissions.map(p => (
                                <tr key={p.id} style={A.tr}>
                                    <td style={{ ...A.td, paddingLeft: 20 }}><span style={{ fontSize: 10, fontWeight: 900, color: '#6366f1' }}>{p.group}</span></td>
                                    <td style={{ ...A.td, fontWeight: 700 }}>{p.name}</td>
                                    <td style={A.td}><code>{p.code}</code></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </TablePanel>
            )}

            {/* Preview Modal */}
            {previewUser && (
                <Modal title={`Capabilities Registry: ${previewUser.profile?.full_name}`} onClose={() => setPreviewUser(null)}>
                    <div style={{ padding: 12, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: 11, fontWeight: 800, marginBottom: 12, color: '#64748b' }}>IZIN AKTIF (SINKRON 100%)</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {getAdminPermissions(previewUser.admin_role).map(p => (
                                <div key={p.id} style={{ fontSize: 10, padding: '6px 10px', background: '#fff', border: '1px solid #f1f5f9', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <i className="bx bx-check-circle" style={{ color: '#10b981' }} /> {p.name}
                                </div>
                            ))}
                            {getAdminPermissions(previewUser.admin_role).length === 0 && <div style={{ fontSize: 11, color: '#94a3b8' }}>No specific permissions found for this role.</div>}
                        </div>
                    </div>
                </Modal>
            )}

            {showRoleModal && selectedRole && (
                <Modal title={selectedRole.id ? "RE-DESIGN SECURITY PROFILE" : "CONSTRUCT SECURITY PROFILE"} onClose={() => setShowRoleModal(false)} wide>
                    <form onSubmit={handleSaveRole}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 24 }}>
                            <div>
                                <FieldLabel>Profile Name</FieldLabel>
                                <input style={{...A.input, marginBottom: 12}} placeholder="e.g. Senior CS Analyst" value={selectedRole.name} onChange={e=>setSelectedRole({...selectedRole, name: e.target.value})} required />
                                <FieldLabel>Operational Context</FieldLabel>
                                <textarea style={{...A.input, height: 100}} value={selectedRole.description} onChange={e=>setSelectedRole({...selectedRole, description: e.target.value})} />
                                <div style={{ marginTop: 24 }}>
                                    <button style={{...A.btnPrimary, width: '100%', height: 44}} type="submit">COMMIT PROFILE SYNC</button>
                                </div>
                            </div>
                            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, maxHeight: 450, overflowY: 'auto' }}>
                                {Object.entries(permissions.reduce((acc, p) => { (acc[p.group] = acc[p.group] || []).push(p); return acc; }, {})).map(([g, ps]) => (
                                    <div key={g} style={{ marginBottom: 20 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <div style={{ fontSize: 10, fontWeight: 900, color: '#6366f1' }}>{g.toUpperCase()}</div>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button type="button" style={{ border: 'none', background: 'transparent', fontSize: 9, fontWeight: 800, color: '#6366f1', cursor: 'pointer' }} onClick={() => toggleGroup(g, true)}>SELECT ALL</button>
                                                <button type="button" style={{ border: 'none', background: 'transparent', fontSize: 9, fontWeight: 800, color: '#94a3b8', cursor: 'pointer' }} onClick={() => toggleGroup(g, false)}>CLEAR</button>
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                            {ps.map(p => (
                                                <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#fff', border: `1px solid ${(selectedRole.permission_ids || []).includes(p.id) ? '#6366f1' : '#f1f5f9'}`, borderRadius: 8, cursor: 'pointer' }}>
                                                    <input type="checkbox" checked={(selectedRole.permission_ids || []).includes(p.id)} onChange={() => togglePermission(p.id)} />
                                                    <span style={{ fontSize: 10, fontWeight: 700 }}>{p.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </form>
                </Modal>
            )}

            {showUserModal && (
                <Modal title="SYSTEM PERSONNEL ONBOARDING" onClose={() => setShowUserModal(false)}>
                    <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                                <FieldLabel>Personnel Full Name</FieldLabel>
                                <input style={A.input} value={newUser.full_name} onChange={e=>setNewUser({...newUser, full_name: e.target.value})} required />
                            </div>
                            <div>
                                <FieldLabel>Corporate Department</FieldLabel>
                                <select style={A.select} value={newUser.department} onChange={e=>setNewUser({...newUser, department: e.target.value})}>
                                    <option value="">No Department</option>
                                    <option value="IT & SYSTEMS">IT & SYSTEMS</option>
                                    <option value="MARKETING">MARKETING</option>
                                    <option value="FINANCE">FINANCE</option>
                                    <option value="CUSTOMER SERVICE">CUSTOMER SERVICE</option>
                                    <option value="LOGISTICS">LOGISTICS</option>
                                </select>
                            </div>
                        </div>
                        <FieldLabel>Email Address</FieldLabel>
                        <input style={A.input} type="email" value={newUser.email} onChange={e=>setNewUser({...newUser, email: e.target.value})} required />
                        <FieldLabel>Access Password</FieldLabel>
                        <input style={A.input} type="password" value={newUser.password} onChange={e=>setNewUser({...newUser, password: e.target.value})} required />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                                <FieldLabel>Privilege Type</FieldLabel>
                                <select style={A.select} value={newUser.role} onChange={e=>setNewUser({...newUser, role: e.target.value})}>
                                    <option value="admin">Administrative</option>
                                    <option value="superadmin">Root Access</option>
                                </select>
                            </div>
                            <div>
                                <FieldLabel>Assigned Security Profile</FieldLabel>
                                <select style={A.select} value={newUser.admin_role} onChange={e=>setNewUser({...newUser, admin_role: e.target.value})} required>
                                    <option value="">Select Role...</option>
                                    {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <button style={{ ...A.btnPrimary, height: 44, marginTop: 12 }} type="submit">SYNCHRONIZE PERSONNEL ACCESS</button>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default AdminRBAC;
