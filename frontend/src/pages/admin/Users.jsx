import React, { useState, useEffect, useCallback } from 'react';
import { ADMIN_API_BASE, AUTH_API_BASE, fetchJson } from '../../lib/api';
import { PageHeader, StatRow, TablePanel, Modal, FieldLabel, statusBadge, roleBadge, fmtDate, fmtRelativeTime, A } from '../../lib/adminStyles.jsx';

const API = ADMIN_API_BASE;

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  
  // Advanced Filters & Pagination
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  
  const [modal, setModal] = useState(null);
  const [newUserData, setNewUserData] = useState({ email: '', password: '', fullName: '', role: 'buyer' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (filterRole) p.append('role', filterRole);
    if (filterStatus) p.append('status', filterStatus);
    if (search) p.append('search', search);
    if (sortBy) p.append('sort', sortBy);
    p.append('page', page);
    p.append('limit', limit);
    
    Promise.all([
      fetchJson(`${API}/users?${p}`),
      fetchJson(`${API}/users/stats`),
    ]).then(([list, s]) => {
      setUsers(list?.data || []);
      setTotal(list?.total || 0);
      setStats(s || {});
    }).catch(console.error).finally(() => setLoading(false));
  }, [filterRole, filterStatus, search, sortBy, page, limit]);

  // Live Search Effect (Debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 400);
    return () => clearTimeout(timer);
  }, [search, filterRole, filterStatus, sortBy, page, limit, load]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, filterRole, filterStatus, sortBy, limit]);

  const totalPages = Math.ceil(total / limit);

  const updateUser = (userId, status, role, adminRole = '') => {
    fetchJson(`${API}/users/update`, {
      method: 'PUT',
      body: JSON.stringify({ user_id: userId, status, role, admin_role: adminRole }),
    }).then(() => { load(); setModal(null); }).catch(e => alert(e.message));
  };

  const createUser = (e) => {
    e.preventDefault();
    setSaving(true);
    fetchJson(`${API}/users/create`, {
      method: 'POST',
      body: JSON.stringify(newUserData),
    }).then(() => {
      load();
      setModal(null);
      setNewUserData({ email: '', password: '', fullName: '', role: 'buyer' });
    }).catch(e => alert(e.message)).finally(() => setSaving(false));
  };

  const deleteUser = (userId) => {
    if (!window.confirm('Hapus pengguna ini secara permanen?')) return;
    fetchJson(`${API}/users/delete?id=${userId}`, { method: 'DELETE' })
      .then(() => { load(); setModal(null); });
  };

  const impersonate = (userId) => {
    if (!window.confirm('Ghost Login sebagai user ini?')) return;
    fetchJson(`${AUTH_API_BASE}/impersonate`, {
      method: 'POST', body: JSON.stringify({ target_user_id: userId }),
    }).then(res => {
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      window.location.href = res.user.role === 'merchant' ? '/merchant' : '/';
    }).catch(e => alert(e.message));
  };

  const filterBar = (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, width: '100%', alignItems: 'center' }}>
      {/* Search Input */}
      <div style={{ ...A.searchWrap, minWidth: 280, flex: 1, position: 'relative' }}>
        <i className="bx bx-search" style={A.searchIcon} />
        <input
          style={{ ...A.searchInput, width: '100%', paddingLeft: 40, paddingRight: 36, height: 42 }}
          placeholder="Cari Nama Lengkap, Email, HP, atau ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button 
            onClick={() => setSearch('')}
            style={{ 
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4,
              display: 'flex', alignItems: 'center'
            }}
          >
            <i className="bx bxs-x-circle" style={{ fontSize: 18 }} />
          </button>
        )}
      </div>

      {/* Selects */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <select style={{ ...A.select, height: 42, minWidth: 130 }} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="">Semua Role</option>
            <option value="buyer">Buyer</option>
            <option value="merchant">Merchant</option>
            <option value="affiliate">Affiliate</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <select style={{ ...A.select, height: 42, minWidth: 130 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Semua Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <select style={{ ...A.select, height: 42, minWidth: 150, border: '1px solid #6366f122', background: '#f5f7ff' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="newest">Daftar Terbaru</option>
            <option value="oldest">Daftar Terlama</option>
            <option value="last_login">Terakhir Login</option>
            <option value="name">Urut Nama (A-Z)</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <select style={{ ...A.select, height: 42, minWidth: 80 }} value={limit} onChange={e => setLimit(parseInt(e.target.value))}>
            <option value="20">20 / Hal</option>
            <option value="50">50 / Hal</option>
            <option value="100">100 / Hal</option>
          </select>
        </div>
      </div>

      <button style={{ ...A.btnGhost, height: 42, width: 42, padding: 0, justifyContent: 'center' }} onClick={load}>
        <i className="bx bx-refresh" style={{ fontSize: 20 }} />
      </button>
      
      <button style={{ ...A.btnPrimary, height: 42 }} onClick={() => setModal('create')}>
        <i className="bx bx-plus-circle" /> Add User
      </button>
    </div>
  );

  return (
    <div style={A.page} className="fade-in">
      <PageHeader 
        title="User Management" 
        subtitle="Analisis data pengguna, filter berdasarkan aktivitas, dan kelola hak akses."
      />

      <StatRow stats={[
        { label: 'Total Users', val: stats.total || 0, icon: 'bxs-group', color: '#6366f1' },
        { label: 'Aktif', val: stats.active || 0, icon: 'bxs-check-circle', color: '#10b981' },
        { label: 'Merchant', val: stats.merchants || 0, icon: 'bxs-store-alt', color: '#0891b2' },
        { label: 'Affiliate', val: stats.affiliates || 0, icon: 'bxs-link', color: '#ea580c' },
      ]} />

      <TablePanel 
        toolbar={filterBar}
        loading={loading}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
          <thead>
            <tr>
              <th style={{ ...A.th, paddingLeft: 24, width: 300 }}>Pengguna & Identitas</th>
              <th style={A.th}>Role</th>
              <th style={A.th}>Status</th>
              <th style={A.th}>Login Terakhir</th>
              <th style={A.th}>Terdaftar</th>
              <th style={{ ...A.th, textAlign: 'right', paddingRight: 24 }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} style={A.empty}>
                  <i className="bx bxs-user-x" style={{ fontSize: 48, color: '#e2e8f0' }} />
                  <div style={{ fontWeight: 700, color: '#94a3b8' }}>Tidak ada pengguna yang sesuai filter</div>
                </td>
              </tr>
            ) : users.map((u, idx) => (
              <tr key={u.id}
                style={{ background: idx % 2 === 0 ? '#fff' : '#fcfcfd' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f5f7ff'}
                onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fcfcfd'}
              >
                <td style={{ ...A.td, paddingLeft: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                      background: u.role === 'admin' ? 'linear-gradient(135deg,#1e293b,#0f172a)' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 800, fontSize: 16,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                    }}>
                      {(u.profile?.full_name || u.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {u.profile?.full_name || 'Tanpa Nama'}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#94a3b8', fontFamily: 'monospace' }}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td style={A.td}>
                  <span style={roleBadge(u.role)}>{u.role}</span>
                  {u.admin_role && <div style={{ fontSize: 9, color: '#6366f1', fontWeight: 800, marginTop: 2, textTransform: 'uppercase' }}>{u.admin_role}</div>}
                </td>
                <td style={A.td}><span style={statusBadge(u.status)}>{u.status}</span></td>
                <td style={A.td}>
                  <div style={{ fontWeight: 600, color: u.last_login_at ? '#475569' : '#cbd5e1' }}>{fmtRelativeTime(u.last_login_at)}</div>
                  {u.last_login_ip && <div style={{ fontSize: 10, color: '#94a3b8' }}>{u.last_login_ip}</div>}
                </td>
                <td style={A.td}>
                  <div style={{ fontSize: 13, color: '#64748b' }}>{fmtDate(u.created_at)}</div>
                </td>
                <td style={{ ...A.td, paddingRight: 24, textAlign: 'right' }}>
                  <button style={A.iconBtn('#6366f1', '#f5f7ff')} onClick={() => setModal(u)} title="Manage User">
                    <i className="bx bx-slider-alt" style={{ fontSize: 18 }} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Pagination Controls */}
        <div style={{ 
          padding: '16px 24px', 
          borderTop: '1px solid #f1f5f9', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          background: '#fcfcfd'
        }}>
          <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>
            Menampilkan <span style={{ color: '#475569' }}>{users.length}</span> dari <span style={{ color: '#475569' }}>{total}</span> pengguna
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              style={{ 
                ...A.btnGhost, 
                padding: '8px 12px', 
                opacity: page === 1 ? 0.5 : 1,
                cursor: page === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              <i className="bx bx-chevron-left" /> Prev
            </button>
            
            <div style={{ 
              padding: '0 16px', 
              fontSize: 13, 
              fontWeight: 800, 
              color: '#6366f1',
              background: '#eef2ff',
              height: 36,
              display: 'flex',
              alignItems: 'center',
              borderRadius: 10
            }}>
              Halaman {page} dari {totalPages || 1}
            </div>

            <button 
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              style={{ 
                ...A.btnGhost, 
                padding: '8px 12px', 
                opacity: page >= totalPages ? 0.5 : 1,
                cursor: page >= totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              Next <i className="bx bx-chevron-right" />
            </button>
          </div>
        </div>
      </TablePanel>

      {/* Modal Create & Update remains the same or slightly improved layout */}
      {modal && modal === 'create' && (
        <Modal title="Tambah User Baru" onClose={() => setModal(null)}>
          <form onSubmit={createUser} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <FieldLabel>Email Address</FieldLabel>
                <input style={A.input} type="email" required value={newUserData.email} onChange={e => setNewUserData({...newUserData, email: e.target.value})} placeholder="email@example.com" />
              </div>
              <div>
                <FieldLabel>Full Name</FieldLabel>
                <input style={A.input} required value={newUserData.fullName} onChange={e => setNewUserData({...newUserData, fullName: e.target.value})} placeholder="Nama Lengkap" />
              </div>
            </div>
            <div>
              <FieldLabel>Password</FieldLabel>
              <input style={A.input} type="password" required value={newUserData.password} onChange={e => setNewUserData({...newUserData, password: e.target.value})} placeholder="Min. 8 Karakter" />
            </div>
            <div>
              <FieldLabel>Role Utama</FieldLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {['buyer', 'merchant', 'affiliate', 'admin'].map(r => (
                  <button type="button" key={r}
                    onClick={() => setNewUserData({...newUserData, role: r})}
                    style={{
                      padding: '12px 4px', borderRadius: 12, border: '1px solid',
                      borderColor: newUserData.role === r ? '#6366f1' : '#e2e8f0',
                      background: newUserData.role === r ? '#f5f7ff' : '#fff',
                      color: newUserData.role === r ? '#6366f1' : '#64748b',
                      fontWeight: 700, fontSize: 12, textTransform: 'capitalize', cursor: 'pointer'
                    }}
                  >{r}</button>
                ))}
              </div>
            </div>
            <button type="submit" disabled={saving} style={{ ...A.btnPrimary, marginTop: 10, height: 48, justifyContent: 'center', fontSize: 15 }}>
              {saving ? 'Proses...' : 'Konfirmasi & Buat Akun'}
            </button>
          </form>
        </Modal>
      )}

      {modal && modal !== 'create' && (
        <Modal title="User Security & Access" onClose={() => setModal(null)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28, padding: '20px', background: '#f8fafc', borderRadius: 20, border: '1px solid #f1f5f9' }}>
            <div style={{
              width: 54, height: 54, borderRadius: 16, flexShrink: 0,
              background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 900, fontSize: 22,
            }}>
              {(modal.profile?.full_name || modal.email || '?').charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 17 }}>{modal.profile?.full_name || '—'}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>{modal.email}</div>
              <span style={roleBadge(modal.role)}>{modal.role}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <FieldLabel>Ubah Role</FieldLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {['buyer', 'merchant', 'affiliate'].map(r => (
                  <button key={r}
                    onClick={() => updateUser(modal.id, modal.status, r)}
                    style={{
                      padding: '12px', borderRadius: 14, border: 'none', cursor: 'pointer',
                      fontWeight: 700, fontSize: 12, textTransform: 'uppercase',
                      background: modal.role === r ? '#6366f1' : '#f1f5f9',
                      color: modal.role === r ? '#fff' : '#64748b',
                      transition: 'all 0.2s'
                    }}
                  >{r}</button>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>Status Akun</FieldLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {[
                  { val: 'active', color: '#10b981', label: 'Aktif' },
                  { val: 'suspended', color: '#f59e0b', label: 'Suspend' },
                  { val: 'banned', color: '#ef4444', label: 'Banned' },
                ].map(s => (
                  <button key={s.val}
                    onClick={() => updateUser(modal.id, s.val, modal.role, modal.admin_role)}
                    style={{
                      padding: '12px', borderRadius: 14, border: 'none', cursor: 'pointer',
                      fontWeight: 700, fontSize: 12, textTransform: 'uppercase',
                      background: modal.status === s.val ? s.color : '#f1f5f9',
                      color: modal.status === s.val ? '#fff' : '#64748b',
                      transition: 'all 0.2s'
                    }}
                  >{s.label}</button>
                ))}
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 24, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <button
                onClick={() => impersonate(modal.id)}
                style={{ ...A.btnPrimary, flex: 1, minWidth: 150, height: 46, justifyContent: 'center', background: 'linear-gradient(135deg,#0f172a,#1e293b)' }}
              >
                <i className="bx bx-ghost" /> Ghost Login
              </button>
              <button
                onClick={() => {
                  const pass = window.prompt('Masukkan password baru untuk user ini:');
                  if (!pass) return;
                  if (pass.length < 6) return alert('Password minimal 6 karakter');
                  fetchJson(`${API}/users/reset-password`, {
                    method: 'POST',
                    body: JSON.stringify({ user_id: modal.id, new_password: pass })
                  }).then(res => alert(res.message || 'Password berhasil diubah')).catch(e => alert(e.message));
                }}
                style={{ ...A.btnPrimary, flex: 1, minWidth: 150, height: 46, justifyContent: 'center', background: '#6366f1' }}
              >
                <i className="bx bx-key" /> Reset Password
              </button>
              <button
                onClick={() => deleteUser(modal.id)}
                style={{ width: 46, height: 46, borderRadius: 12, border: '1px solid #fee2e2', background: '#fff', color: '#ef4444', cursor: 'pointer', flexShrink: 0 }}
                title="Hapus User"
              >
                <i className="bx bx-trash" style={{ fontSize: 20 }} />
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
