import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, AUTH_API_BASE, fetchJson } from '../../lib/api';
import { PageHeader, StatRow, TablePanel, Modal, FieldLabel, statusBadge, roleBadge, fmtDate, A } from '../../lib/adminStyles.jsx';

const API = ADMIN_API_BASE;

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);

  const load = () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (filterRole) p.append('role', filterRole);
    if (filterStatus) p.append('status', filterStatus);
    if (search) p.append('search', search);
    Promise.all([
      fetchJson(`${API}/users?${p}`),
      fetchJson(`${API}/users/stats`),
    ]).then(([list, s]) => {
      setUsers(list || []);
      setStats(s || {});
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterRole, filterStatus]);

  const updateUser = (userId, status, role, adminRole = '') => {
    fetchJson(`${API}/users/update`, {
      method: 'PUT',
      body: JSON.stringify({ user_id: userId, status, role, admin_role: adminRole }),
    }).then(() => { load(); setModal(null); }).catch(e => alert(e.message));
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

  return (
    <div style={A.page} className="fade-in">
      <PageHeader title="User Management" subtitle="Kelola seluruh pengguna, role, dan akses keamanan platform.">
        <div style={A.searchWrap}>
          <i className="bx bx-search" style={A.searchIcon} />
          <input
            style={A.searchInput}
            placeholder="Cari nama / email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
          />
        </div>
        <select style={A.select} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="">Semua Role</option>
          <option value="buyer">Buyer</option>
          <option value="merchant">Merchant</option>
          <option value="affiliate">Affiliate</option>
          <option value="admin">Admin</option>
        </select>
        <select style={A.select} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Semua Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="banned">Banned</option>
        </select>
        <button style={A.btnGhost} onClick={load}><i className="bx bx-refresh" /></button>
      </PageHeader>

      <StatRow stats={[
        { label: 'Total Users', val: stats.total || 0, icon: 'bxs-group', color: '#6366f1' },
        { label: 'Aktif', val: stats.active || 0, icon: 'bxs-check-circle', color: '#10b981' },
        { label: 'Merchant', val: stats.merchants || 0, icon: 'bxs-store-alt', color: '#0891b2' },
        { label: 'Affiliate', val: stats.affiliates || 0, icon: 'bxs-link', color: '#ea580c' },
      ]} />

      <TablePanel loading={loading}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
          <thead>
            <tr>
              {['Pengguna', 'Role', 'Status', 'Terdaftar', 'Aksi'].map((h, i) => (
                <th key={h} style={{ ...A.th, textAlign: i === 4 ? 'right' : 'left', paddingLeft: i === 0 ? 24 : 16, paddingRight: i === 4 ? 24 : 16 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
                <i className="bx bxs-ghost" style={{ fontSize: 40, display: 'block', marginBottom: 8, opacity: 0.3 }} />
                Tidak ada pengguna ditemukan.
              </td></tr>
            ) : users.map((u, idx) => (
              <tr key={u.id}
                style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f5f7ff'}
                onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa'}
              >
                <td style={{ ...A.td, paddingLeft: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                      background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 800, fontSize: 15,
                    }}>
                      {(u.profile?.full_name || u.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{u.profile?.full_name || '—'}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td style={A.td}><span style={roleBadge(u.role)}>{u.role}</span></td>
                <td style={A.td}><span style={statusBadge(u.status)}>{u.status}</span></td>
                <td style={A.td}><span style={{ fontSize: 13 }}>{fmtDate(u.created_at)}</span></td>
                <td style={{ ...A.td, paddingRight: 24, textAlign: 'right' }}>
                  <button style={A.iconBtn('#6366f1', '#eef2ff')} onClick={() => setModal(u)} title="Kelola User">
                    <i className="bx bx-cog" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TablePanel>

      {modal && (
        <Modal title="User Management Panel" onClose={() => setModal(null)}>
          {/* User Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, padding: '16px', background: '#f8fafc', borderRadius: 12 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 900, fontSize: 20,
            }}>
              {(modal.profile?.full_name || modal.email || '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 16 }}>{modal.profile?.full_name || '—'}</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>{modal.email}</div>
              <div style={{ marginTop: 4 }}><span style={roleBadge(modal.role)}>{modal.role}</span></div>
            </div>
          </div>

          {/* Role control */}
          <div style={{ marginBottom: 20 }}>
            <FieldLabel>Ubah Role</FieldLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {['buyer', 'merchant', 'affiliate'].map(r => (
                <button key={r}
                  onClick={() => updateUser(modal.id, modal.status, r)}
                  style={{
                    padding: '9px', borderRadius: 11, border: 'none', cursor: 'pointer',
                    fontWeight: 700, fontSize: 12, textTransform: 'uppercase',
                    background: modal.role === r ? '#6366f1' : '#f8fafc',
                    color: modal.role === r ? '#fff' : '#64748b',
                  }}
                >{r}</button>
              ))}
            </div>
          </div>

          {/* Status control */}
          <div style={{ marginBottom: 20 }}>
            <FieldLabel>Status Akun</FieldLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                { val: 'active', color: '#10b981' },
                { val: 'suspended', color: '#f59e0b' },
                { val: 'banned', color: '#ef4444' },
              ].map(s => (
                <button key={s.val}
                  onClick={() => updateUser(modal.id, s.val, modal.role, modal.admin_role)}
                  style={{
                    padding: '9px', borderRadius: 11, border: 'none', cursor: 'pointer',
                    fontWeight: 700, fontSize: 12, textTransform: 'uppercase',
                    background: modal.status === s.val ? s.color : '#f8fafc',
                    color: modal.status === s.val ? '#fff' : '#64748b',
                  }}
                >{s.val}</button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={() => impersonate(modal.id)}
              style={{ ...A.btnPrimary, justifyContent: 'center', padding: '12px', background: 'linear-gradient(135deg,#0891b2,#0e7490)' }}
            >
              <i className="bx bx-ghost" /> Ghost Login (Impersonate)
            </button>
            <button
              onClick={() => deleteUser(modal.id)}
              style={{ padding: '10px', borderRadius: 11, border: 'none', background: 'transparent', color: '#ef4444', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
            >
              Hapus Pengguna Permanen
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
