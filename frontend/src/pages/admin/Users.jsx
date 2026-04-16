import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';

const API = ADMIN_API_BASE;
const ADMIN_AVATAR = '/admin-assets/images/avatars/avatar-1.png';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const loadUsers = () => {
    const params = new URLSearchParams();
    if (filterRole) params.append('role', filterRole);
    if (filterStatus) params.append('status', filterStatus);
    if (search) params.append('search', search);

    Promise.all([
      fetchJson(`${API}/users?${params}`),
      fetchJson(`${API}/users/stats`)
    ]).then(([list, s]) => {
      setUsers(list.data || []);
      setStats(s);
    }).catch(err => {
      console.error("Failed to load users:", err);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    const params = new URLSearchParams();
    if (filterRole) params.append('role', filterRole);
    if (filterStatus) params.append('status', filterStatus);

    Promise.all([
      fetchJson(`${API}/users?${params}`),
      fetchJson(`${API}/users/stats`)
    ]).then(([list, s]) => {
      setUsers(list.data || []);
      setStats(s);
    }).catch(err => {
      console.error("Failed to load users:", err);
    }).finally(() => setLoading(false));
  }, [filterRole, filterStatus]);

  const handleSearch = (e) => {
    e.preventDefault();
    setLoading(true);
    loadUsers();
  };

  const updateUser = (userId, status, role, adminRole = '') => {
    fetch(`${API}/users/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, status, role, admin_role: adminRole }),
    }).then(r => r.json()).then(() => {
      loadUsers();
    });
  };

  const deleteUser = (userId) => {
    if (!window.confirm("Hapus pengguna ini secara permanen?")) return;
    fetch(`${API}/users/delete?id=${userId}`, {
      method: 'DELETE',
    }).then(() => {
      loadUsers();
    });
  };

  const getStatusBadgeClass = (status) => {
    if (status === 'active') return 'bg-success';
    if (status === 'suspended') return 'bg-warning text-dark';
    if (status === 'banned') return 'bg-danger';
    return 'bg-secondary';
  };

  const formatDate = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('id-ID');
  };

  const renderDesktopActions = (user) => (
    <div className="d-flex justify-content-end">
      <div className="dropdown">
        <button
          className="btn btn-sm btn-outline-secondary dropdown-toggle"
          type="button"
          data-bs-toggle="dropdown"
        >
          Kelola
        </button>
        <ul className="dropdown-menu dropdown-menu-end shadow-sm users-action-menu">
          {user.role === 'admin' ? (
            <>
              <li><h6 className="dropdown-header">Role Admin</h6></li>
              <li><button className="dropdown-item" onClick={() => updateUser(user.id, user.status, 'admin', 'super')}>Jadikan Super Admin</button></li>
              <li><button className="dropdown-item" onClick={() => updateUser(user.id, user.status, 'admin', 'finance')}>Jadikan Finance Admin</button></li>
              <li><button className="dropdown-item" onClick={() => updateUser(user.id, user.status, 'admin', 'cs_staff')}>Jadikan CS Staff</button></li>
              <li><hr className="dropdown-divider" /></li>
              <li><button className="dropdown-item text-danger" onClick={() => updateUser(user.id, user.status, 'buyer')}>Turunkan ke Buyer</button></li>
            </>
          ) : (
            <>
              <li><h6 className="dropdown-header">Role</h6></li>
              <li><button className="dropdown-item" onClick={() => updateUser(user.id, user.status, 'admin', 'cs_staff')}>Promote ke Admin</button></li>
            </>
          )}
          <li><hr className="dropdown-divider" /></li>
          <li><h6 className="dropdown-header">Status</h6></li>
          <li><button className="dropdown-item" onClick={() => updateUser(user.id, 'active', user.role, user.admin_role)}>Aktifkan</button></li>
          <li><button className="dropdown-item" onClick={() => updateUser(user.id, 'suspended', user.role, user.admin_role)}>Suspend</button></li>
          <li><button className="dropdown-item" onClick={() => updateUser(user.id, 'banned', user.role, user.admin_role)}>Ban</button></li>
          <li><hr className="dropdown-divider" /></li>
          <li><button className="dropdown-item text-danger" onClick={() => deleteUser(user.id)}>Hapus Pengguna</button></li>
        </ul>
      </div>
    </div>
  );

  const renderMobileActions = (user) => (
    <div className="users-mobile-actions">
      <div className="users-mobile-actions__section">
        <div className="users-mobile-actions__label">Role</div>
        {user.role === 'admin' ? (
          <div className="users-mobile-actions__grid">
            <button className="btn btn-sm btn-outline-info" onClick={() => updateUser(user.id, user.status, 'admin', 'super')}>Super</button>
            <button className="btn btn-sm btn-outline-info" onClick={() => updateUser(user.id, user.status, 'admin', 'finance')}>Finance</button>
            <button className="btn btn-sm btn-outline-info" onClick={() => updateUser(user.id, user.status, 'admin', 'cs_staff')}>CS Staff</button>
            <button className="btn btn-sm btn-outline-danger" onClick={() => updateUser(user.id, user.status, 'buyer')}>Jadi Buyer</button>
          </div>
        ) : (
          <button className="btn btn-sm btn-outline-primary w-100" onClick={() => updateUser(user.id, user.status, 'admin', 'cs_staff')}>Promote ke Admin</button>
        )}
      </div>
      <div className="users-mobile-actions__section">
        <div className="users-mobile-actions__label">Status</div>
        <div className="users-mobile-actions__grid">
          <button className="btn btn-sm btn-outline-success" onClick={() => updateUser(user.id, 'active', user.role, user.admin_role)}>Aktifkan</button>
          <button className="btn btn-sm btn-outline-warning" onClick={() => updateUser(user.id, 'suspended', user.role, user.admin_role)}>Suspend</button>
          <button className="btn btn-sm btn-outline-danger" onClick={() => updateUser(user.id, 'banned', user.role, user.admin_role)}>Ban</button>
        </div>
      </div>
      <button className="btn btn-sm btn-danger-subtle text-danger-emphasis border w-100" onClick={() => deleteUser(user.id)}>Hapus Pengguna</button>
    </div>
  );

  return (
    <div className="users-admin-page">
      <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
        <div className="breadcrumb-title pe-3">Super Admin</div>
        <div className="ps-3">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0 p-0">
              <li className="breadcrumb-item"><Link to="/admin"><i className="bx bx-home-alt"></i></Link></li>
              <li className="breadcrumb-item active" aria-current="page">Kelola Pengguna</li>
            </ol>
          </nav>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Total User', val: stats.total || 0, color: '#4361ee' },
          { label: 'Aktif', val: stats.active || 0, color: '#06d6a0' },
          { label: 'Suspended', val: stats.suspended || 0, color: '#ef476f' },
          { label: 'Buyer', val: stats.buyers || 0, color: '#7209b7' },
          { label: 'Affiliate', val: stats.affiliates || 0, color: '#f72585' },
          { label: 'Merchant', val: stats.merchants || 0, color: '#4cc9f0' },
        ].map(s => (
          <div key={s.label} className="col-6 col-sm-4 col-lg">
            <div className="card radius-10 h-100 mb-0">
              <div className="card-body text-center py-3">
                <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 11, color: 'var(--bs-secondary-color)', textTransform: 'uppercase' }}>{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card radius-10">
        <div className="card-header py-3">
          <div className="row align-items-center m-0 g-2">
            <div className="col-md-4 col-12 me-auto">
               <form onSubmit={handleSearch} className="d-flex flex-column flex-sm-row gap-2">
                  <input type="search" className="form-control form-control-sm" placeholder="Cari email atau telepon..." 
                    value={search} onChange={e => setSearch(e.target.value)} />
                  <button type="submit" className="btn btn-sm btn-primary flex-shrink-0">Cari</button>
               </form>
            </div>
            <div className="col-md-2 col-6">
              <select className="form-select form-select-sm" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
                  <option value="">Semua Role</option>
                  <option value="buyer">Buyer</option>
                  <option value="affiliate">Affiliate</option>
                  <option value="merchant">Merchant</option>
                  <option value="admin">Admin</option>
              </select>
            </div>
            <div className="col-md-2 col-6">
              <select className="form-select form-select-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="">Semua Status</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="banned">Banned</option>
              </select>
            </div>
          </div>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
          ) : users.length === 0 ? (
            <div className="text-center py-4 text-muted">Tidak ada pengguna ditemukan</div>
          ) : (
            <>
            <div className="users-table-shell d-none d-lg-block">
              <table className="table align-middle table-striped mb-0">
                <thead className="table-light">
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Terdaftar</th>
                    <th className="text-end">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td style={{ minWidth: 220 }}>
                        <div className="d-flex align-items-center gap-3">
                          <div className="product-box border" style={{ borderRadius: '50%', width: 35, height: 35, overflow: 'hidden'}}>
                              <img src={user.profile?.avatar_url || ADMIN_AVATAR} alt="" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                          </div>
                          <div>
                              <h6 className="mb-0 small fw-bold">{user.profile?.full_name || 'No Name'}</h6>
                              <small className="text-muted" style={{fontSize: 11}}>{user.email}</small>
                          </div>
                        </div>
                      </td>
                      <td style={{ minWidth: 120 }}>
                        <span className={`badge bg-light-${user.role === 'admin' ? 'purple text-purple' : 'info text-info'} rounded-pill`}>
                          {user.role}
                        </span>
                      </td>
                      <td style={{ minWidth: 120 }}>
                        <span className={`badge ${getStatusBadgeClass(user.status)}`}>
                          {user.status}
                        </span>
                      </td>
                      <td><span className="small text-muted">{formatDate(user.created_at)}</span></td>
                      <td style={{ minWidth: 170 }}>
                        {renderDesktopActions(user)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="d-grid gap-3 d-lg-none">
              {users.map((user) => (
                <article key={user.id} className="card border-0 shadow-sm users-mobile-card">
                  <div className="card-body">
                    <div className="d-flex align-items-start gap-3 mb-3">
                      <div className="product-box border" style={{ borderRadius: '50%', width: 48, height: 48, overflow: 'hidden', flexShrink: 0 }}>
                        <img src={user.profile?.avatar_url || ADMIN_AVATAR} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div className="flex-grow-1 min-w-0">
                        <h6 className="mb-1 fw-bold">{user.profile?.full_name || 'No Name'}</h6>
                        <div className="small text-muted text-break">{user.email}</div>
                      </div>
                    </div>
                    <div className="users-mobile-meta">
                      <div><span className="users-mobile-meta__label">Role</span><span className="badge bg-light-info text-info rounded-pill">{user.role}</span></div>
                      <div><span className="users-mobile-meta__label">Status</span><span className={`badge ${getStatusBadgeClass(user.status)}`}>{user.status}</span></div>
                      <div><span className="users-mobile-meta__label">Terdaftar</span><span className="small text-muted">{formatDate(user.created_at)}</span></div>
                    </div>
                    {renderMobileActions(user)}
                  </div>
                </article>
              ))}
            </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
