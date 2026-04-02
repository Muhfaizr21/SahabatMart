import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';

const API = ADMIN_API_BASE;

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

  return (
    <>
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
               <form onSubmit={handleSearch} className="d-flex gap-2">
                  <input type="search" className="form-control form-control-sm" placeholder="Cari email atau telepon..." 
                    value={search} onChange={e => setSearch(e.target.value)} />
                  <button type="submit" className="btn btn-sm btn-primary">Cari</button>
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
          ) : (
            <div className="table-responsive">
              <table className="table align-middle table-striped mb-0">
                <thead className="table-light">
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Terdaftar</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-4 text-muted">Tidak ada pengguna ditemukan</td></tr>
                  ) : users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          <div className="product-box border" style={{ borderRadius: '50%', width: 35, height: 35, overflow: 'hidden'}}>
                              <img src={user.profile?.avatar_url || '/admin-assets/images/avatars/avatar-1.png'} alt="" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                          </div>
                          <div>
                              <h6 className="mb-0 small fw-bold">{user.profile?.full_name || 'No Name'}</h6>
                              <small className="text-muted" style={{fontSize: 11}}>{user.email}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge bg-light-${user.role === 'admin' ? 'purple text-purple' : 'info text-info'} rounded-pill`}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <span className={`badge bg-${user.status === 'active' ? 'success' : 'danger'}`}>
                          {user.status}
                        </span>
                      </td>
                      <td><span className="small text-muted">{new Date(user.created_at).toLocaleDateString('id-ID')}</span></td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          {user.role === 'admin' ? (
                            <div className="dropdown">
                              <button className="btn btn-xs btn-outline-info dropdown-toggle" type="button" data-bs-toggle="dropdown">
                                {user.admin_role || 'Staff'}
                              </button>
                              <ul className="dropdown-menu">
                                <li><button className="dropdown-item" onClick={() => updateUser(user.id, user.status, 'admin', 'super')}>Super Admin</button></li>
                                <li><button className="dropdown-item" onClick={() => updateUser(user.id, user.status, 'admin', 'finance')}>Finance Admin</button></li>
                                <li><button className="dropdown-item" onClick={() => updateUser(user.id, user.status, 'admin', 'cs_staff')}>CS Staff</button></li>
                                <div className="dropdown-divider"></div>
                                <li><button className="dropdown-item text-danger" onClick={() => updateUser(user.id, user.status, 'buyer')}>Demote to Buyer</button></li>
                              </ul>
                            </div>
                          ) : (
                            <button className="btn btn-xs btn-outline-primary" onClick={() => updateUser(user.id, user.status, 'admin', 'cs_staff')}>Promote Admin</button>
                          )}
                          <div className="dropdown">
                            <button className="btn btn-xs btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                              Status
                            </button>
                            <ul className="dropdown-menu">
                              <li><button className="dropdown-item" onClick={() => updateUser(user.id, 'active', user.role, user.admin_role)}>Activate</button></li>
                              <li><button className="dropdown-item" onClick={() => updateUser(user.id, 'suspended', user.role, user.admin_role)}>Suspend</button></li>
                            </ul>
                          </div>
                          <button className="btn btn-xs btn-outline-danger" onClick={() => deleteUser(user.id)}>
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AdminUsers;
