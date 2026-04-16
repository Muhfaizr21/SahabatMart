import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, AUTH_API_BASE, fetchJson } from '../../lib/api';

const API = ADMIN_API_BASE;
const ADMIN_AVATAR = 'https://ui-avatars.com/api/?background=4361ee&color=fff&name=SM';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const loadUsers = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterRole) params.append('role', filterRole);
    if (filterStatus) params.append('status', filterStatus);
    if (search) params.append('search', search);

    Promise.all([
      fetchJson(`${API}/users?${params}`),
      fetchJson(`${API}/users/stats`)
    ]).then(([list, s]) => {
      setUsers(list.data || []);
      setStats(s || {});
    }).catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadUsers(); }, [filterRole, filterStatus]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadUsers();
  };

  const updateUser = (userId, status, role, adminRole = '') => {
    fetchJson(`${API}/users/update`, {
      method: 'PUT',
      body: JSON.stringify({ user_id: userId, status, role, admin_role: adminRole }),
    }).then(() => {
      loadUsers();
      setShowModal(false);
    }).catch(err => alert(err.message));
  };

  const deleteUser = (userId) => {
    if (!window.confirm("Hapus pengguna ini secara permanen?")) return;
    fetchJson(`${API}/users/delete?id=${userId}`, { method: 'DELETE' })
      .then(() => {
        loadUsers();
        setShowModal(false);
      });
  };

  const handleImpersonate = (userId) => {
    if (!window.confirm("Ghost Login? Sesi Anda akan digantikan sementara sebagai user ini.")) return;
    fetchJson(`${AUTH_API_BASE}/impersonate`, {
      method: 'POST',
      body: JSON.stringify({ target_user_id: userId })
    }).then(res => {
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      window.location.href = res.user.role === 'merchant' ? '/merchant' : (res.user.role === 'affiliate' ? '/affiliate' : '/');
    }).catch(err => alert(err.message));
  };

  const openManage = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  return (
    <div className="container-fluid py-4" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Monster Header */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between mb-4 bg-white p-4 rounded-4 shadow-sm border border-light gap-3">
        <div>
          <h4 className="fw-bold text-dark mb-1">User Control Center</h4>
          <p className="text-secondary small mb-0">Manajemen akses, role, dan otoritas seluruh pengguna platform.</p>
        </div>
      </div>

      {/* Modern Stats Grid */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Total Users', val: stats.total || 0, icon: 'bx-group', color: 'primary' },
          { label: 'Active', val: stats.active || 0, icon: 'bx-check-double', color: 'success' },
          { label: 'Merchant', val: stats.merchants || 0, icon: 'bx-store', color: 'info' },
          { label: 'Affiliate', val: stats.affiliates || 0, icon: 'bx-link', color: 'warning' },
        ].map(s => (
          <div key={s.label} className="col-6 col-md-3">
            <div className="card border-0 rounded-4 shadow-sm h-100 border-start border-4" style={{ borderColor: `var(--bs-${s.color}) !important` }}>
              <div className="card-body p-3">
                <div className="d-flex align-items-center gap-2 mb-2">
                   <div className={`bg-${s.color}-subtle text-${s.color} rounded-circle d-flex align-items-center justify-content-center`} style={{ width: 30, height: 30 }}>
                      <i className={`bx ${s.icon} fs-6`} />
                   </div>
                   <small className="text-uppercase fw-bold text-muted" style={{ fontSize: 10 }}>{s.label}</small>
                </div>
                <h4 className="fw-bold mb-0 text-dark">{s.val}</h4>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Advanced Filter Card */}
      <div className="card border-0 rounded-4 shadow-sm mb-4">
        <div className="card-body p-3">
          <form onSubmit={handleSearch} className="row g-2 align-items-center">
            <div className="col-12 col-md-4">
              <div className="input-group">
                <span className="input-group-text bg-light border-0"><i className="bx bx-search text-muted" /></span>
                <input type="text" className="form-control bg-light border-0 shadow-none" placeholder="Cari email, telp atau nama..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="col-6 col-md-3">
              <select className="form-select bg-light border-0 shadow-none" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
                <option value="">Semua Role</option>
                <option value="buyer">Buyer / User</option>
                <option value="merchant">Merchant</option>
                <option value="affiliate">Affiliate</option>
                <option value="admin">Administrator Staff</option>
              </select>
            </div>
            <div className="col-6 col-md-3">
              <select className="form-select bg-light border-0 shadow-none" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="suspended">Suspended</option>
                <option value="banned">Banned</option>
              </select>
            </div>
            <div className="col-12 col-md-2">
              <button type="submit" className="btn btn-primary w-100 fw-bold rounded-3 shadow-sm">Filter</button>
            </div>
          </form>
        </div>
      </div>

      {/* Main Table */}
      <div className="card border-0 rounded-4 shadow-sm overflow-hidden border border-light transition-all">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="bg-light">
              <tr>
                <th className="ps-4 py-3 text-uppercase small fw-bold text-secondary">Profil Pengguna</th>
                <th className="py-3 text-uppercase small fw-bold text-secondary">Akses / Role</th>
                <th className="py-3 text-uppercase small fw-bold text-secondary">Status Keamanan</th>
                <th className="pe-4 py-3 text-uppercase small fw-bold text-secondary text-end">Manajemen</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-5"><div className="spinner-border text-primary" /></td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-5 text-muted">Data pengguna tidak ditemukan.</td></tr>
              ) : users.map(user => (
                <tr key={user.id}>
                  <td className="ps-4">
                    <div className="d-flex align-items-center gap-3 py-1">
                      <img src={user.profile?.avatar_url || ADMIN_AVATAR} className="rounded-circle border border-2" style={{ width: 42, height: 42, objectFit: 'cover' }} alt="" />
                      <div>
                        <div className="fw-bold text-dark">{user.profile?.full_name || 'Tanpa Nama'}</div>
                        <div className="text-muted small" style={{ fontSize: 11 }}>{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge rounded-pill px-3 py-2 fw-bold text-uppercase ${user.role === 'admin' ? 'bg-indigo text-white' : 'bg-light text-dark border'}`} style={{ fontSize: 10 }}>
                      <i className={`bx ${user.role === 'admin' ? 'bx-shield-quarter' : 'bx-user'} me-1`} /> {user.role}
                    </span>
                  </td>
                  <td>
                    <span className={`badge rounded-pill px-3 py-2 ${user.status === 'active' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                      {user.status === 'active' ? 'Account Secured' : user.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="pe-4 text-end">
                    <button className="btn btn-light btn-sm rounded-3 fw-bold px-3 border shadow-sm" onClick={() => openManage(user)}>
                      Manage Access <i className="bx bx-cog ms-1" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* USER MANAGEMENT MODAL */}
      {showModal && selectedUser && (
        <div className="modal show d-block" style={{ background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(10px)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden">
              <div className="modal-header border-0 bg-dark text-white p-4">
                <h5 className="modal-title fw-bold">Management Panel</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)} />
              </div>
              <div className="modal-body p-4">
                <div className="text-center mb-4">
                  <img src={selectedUser.profile?.avatar_url || ADMIN_AVATAR} className="rounded-circle border border-4 border-light shadow-sm" style={{ width: 80, height: 80, objectFit: 'cover' }} alt="" />
                  <h5 className="fw-bold mt-3 mb-1 text-dark">{selectedUser.profile?.full_name || 'User'}</h5>
                  <div className="text-secondary small">{selectedUser.email}</div>
                </div>

                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label small fw-bold text-uppercase text-secondary">Tetapkan Role Sistem</label>
                    <div className="d-grid gap-2">
                       {selectedUser.role === 'admin' ? (
                         <div className="btn-group w-100 shadow-sm border rounded-pill overflow-hidden">
                            <button className={`btn btn-sm ${selectedUser.admin_role === 'super' ? 'btn-primary' : 'btn-light'}`} onClick={() => updateUser(selectedUser.id, selectedUser.status, 'admin', 'super')}>Super</button>
                            <button className={`btn btn-sm ${selectedUser.admin_role === 'finance' ? 'btn-primary' : 'btn-light'}`} onClick={() => updateUser(selectedUser.id, selectedUser.status, 'admin', 'finance')}>Finance</button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => updateUser(selectedUser.id, selectedUser.status, 'buyer')}>Degrade</button>
                         </div>
                       ) : (
                         <button className="btn btn-outline-primary fw-bold rounded-pill shadow-sm py-2" onClick={() => updateUser(selectedUser.id, selectedUser.status, 'admin', 'cs_staff')}>
                           <i className="bx bx-up-arrow-circle me-1" /> Promote to Staff Admin
                         </button>
                       )}
                    </div>
                  </div>

                  <div className="col-12">
                     <label className="form-label small fw-bold text-uppercase text-secondary mt-2">Kontrol Status</label>
                     <div className="row g-2 text-center">
                        <div className="col-4">
                           <button className={`btn btn-sm w-100 rounded-3 py-2 fw-bold ${selectedUser.status === 'active' ? 'btn-success shadow' : 'btn-light border'}`} onClick={() => updateUser(selectedUser.id, 'active', selectedUser.role, selectedUser.admin_role)}>Active</button>
                        </div>
                        <div className="col-4">
                           <button className={`btn btn-sm w-100 rounded-3 py-2 fw-bold ${selectedUser.status === 'suspended' ? 'btn-warning shadow' : 'btn-light border'}`} onClick={() => updateUser(selectedUser.id, 'suspended', selectedUser.role, selectedUser.admin_role)}>Suspend</button>
                        </div>
                        <div className="col-4">
                           <button className={`btn btn-sm w-100 rounded-3 py-2 fw-bold ${selectedUser.status === 'banned' ? 'btn-danger shadow' : 'btn-light border'}`} onClick={() => updateUser(selectedUser.id, 'banned', selectedUser.role, selectedUser.admin_role)}>Ban</button>
                        </div>
                     </div>
                  </div>

                  <div className="col-12 mt-4 pt-4 border-top">
                     <div className="d-grid gap-2">
                        <button className="btn btn-info text-white fw-bold py-3 rounded-4 shadow-sm d-flex align-items-center justify-content-center gap-2" onClick={() => handleImpersonate(selectedUser.id)}>
                           <i className="bx bx-ghost fs-4" /> Ghost Login (Impersonate)
                        </button>
                        <button className="btn btn-link text-danger fw-bold text-decoration-none mt-2" onClick={() => deleteUser(selectedUser.id)}>
                           Hapus Pengguna Permanen
                        </button>
                     </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .bg-indigo { background-color: #6610f2; }
        .text-indigo { color: #6610f2; }
        .btn-group .btn { filter: none !important; }
      `}</style>
    </div>
  );
};

export default AdminUsers;
