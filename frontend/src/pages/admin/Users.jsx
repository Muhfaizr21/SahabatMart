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
  const [newUserData, setNewUserData] = useState({ email: '', password: '', fullName: '', phone: '', role: 'affiliate' });
  const [saving, setSaving] = useState(false);
  
  const [downlines, setDownlines] = useState([]);
  const [loadingDownlines, setLoadingDownlines] = useState(false);
  const [activeUserForDownline, setActiveUserForDownline] = useState(null);

  // Bulk Notification States
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [bulkTitle, setBulkTitle] = useState('');
  const [bulkMessage, setBulkMessage] = useState('');

  // Reset selected users when filters / page change
  useEffect(() => {
    setSelectedUserIds([]);
  }, [filterRole, filterStatus, search, sortBy, page, limit]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedUserIds(users.map(u => u.id));
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleSelectUser = (userId) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  const sendBulkNotify = (e) => {
    e.preventDefault();
    setSaving(true);
    fetchJson(`${API}/users/bulk-notify`, {
      method: 'POST',
      body: JSON.stringify({
        user_ids: selectedUserIds,
        title: bulkTitle,
        message: bulkMessage
      }),
    }).then(res => {
      alert(res.message || 'Notifikasi berhasil dikirim!');
      setSelectedUserIds([]);
      setModal(null);
      setBulkTitle('');
      setBulkMessage('');
    }).catch(e => alert(e.message)).finally(() => setSaving(false));
  };

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

  const updateUser = (userId, status, role, phone, adminRole = '') => {
    fetchJson(`${API}/users/update`, {
      method: 'PUT',
      body: JSON.stringify({ user_id: userId, status, role, phone, admin_role: adminRole }),
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
      setNewUserData({ email: '', password: '', fullName: '', phone: '', role: 'affiliate' });
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

  const viewDownlines = (user) => {
    setActiveUserForDownline(user);
    setLoadingDownlines(true);
    fetchJson(`${API}/users/downlines?user_id=${user.id}`)
      .then(res => {
        // fetchJson automatically unwraps { status: 'success', data: [...] }
        setDownlines(res || []);
        setModal('downlines');
      })
      .catch(e => alert(e.message))
      .finally(() => setLoadingDownlines(false));
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
            <option value="merchant">Merchant</option>
            <option value="affiliate">Affiliate</option>
            <option value="superadmin">Superadmin</option>
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
      
      {selectedUserIds.length > 0 && (
        <button 
          style={{ ...A.btnPrimary, height: 42, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 4px 12px rgba(16,185,129,0.2)', border: 'none' }} 
          onClick={() => setModal('bulk-notify')}
        >
          <i className="bx bx-send" /> Kirim Pesan ({selectedUserIds.length})
        </button>
      )}

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
              <th style={{ ...A.th, paddingLeft: 24, width: 60, textAlign: 'center' }}>
                <input 
                  type="checkbox" 
                  checked={users.length > 0 && selectedUserIds.length === users.length}
                  onChange={handleSelectAll}
                  style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#6366f1' }}
                />
              </th>
              <th style={{ ...A.th, width: 250 }}>Pengguna & Identitas</th>
              <th style={A.th}>No. Telepon</th>
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
                <td colSpan={8} style={A.empty}>
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
                <td style={{ ...A.td, paddingLeft: 24, textAlign: 'center' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedUserIds.includes(u.id)}
                    onChange={() => handleSelectUser(u.id)}
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#6366f1' }}
                  />
                </td>
                <td style={A.td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                      background: (u.role === 'admin' || u.role === 'superadmin') ? 'linear-gradient(135deg,#1e293b,#0f172a)' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
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
                  <div style={{ fontSize: 13, fontWeight: 600, color: u.phone ? '#475569' : '#cbd5e1' }}>
                    {u.phone || '—'}
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
                  <button style={A.iconBtn('#ea580c', '#fff7ed')} onClick={() => viewDownlines(u)} title="Lihat Downline" disabled={loadingDownlines}>
                    <i className="bx bx-git-branch" style={{ fontSize: 18 }} />
                  </button>
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

      {/* Modal Bulk Notification */}
      {modal && modal === 'bulk-notify' && (
        <Modal title={`Kirim Notifikasi ke ${selectedUserIds.length} Pengguna`} onClose={() => setModal(null)}>
          <form onSubmit={sendBulkNotify} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <FieldLabel>Judul Notifikasi</FieldLabel>
              <input 
                style={A.input} 
                required 
                value={bulkTitle} 
                onChange={e => setBulkTitle(e.target.value)} 
                placeholder="Contoh: Info Penting / Promo Khusus" 
              />
            </div>
            <div>
              <FieldLabel>Isi Pesan Notifikasi</FieldLabel>
              <textarea 
                style={{ ...A.input, height: 120, resize: 'none', padding: '12px', boxSizing: 'border-box' }} 
                required 
                value={bulkMessage} 
                onChange={e => setBulkMessage(e.target.value)} 
                placeholder="Tulis pesan lengkap yang ingin dikirim langsung ke notifikasi pengguna terpilih..." 
              />
            </div>
            <button type="submit" disabled={saving} style={{ ...A.btnPrimary, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', marginTop: 10, height: 48, justifyContent: 'center', fontSize: 15 }}>
              {saving ? 'Mengirim...' : 'Kirim Sekarang'}
            </button>
          </form>
        </Modal>
      )}

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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <FieldLabel>Password</FieldLabel>
                <input style={A.input} type="password" required value={newUserData.password} onChange={e => setNewUserData({...newUserData, password: e.target.value})} placeholder="Min. 8 Karakter" />
              </div>
              <div>
                <FieldLabel>No. Telepon</FieldLabel>
                <input style={A.input} type="text" value={newUserData.phone || ''} onChange={e => setNewUserData({...newUserData, phone: e.target.value})} placeholder="Contoh: 0812345678" />
              </div>
            </div>
            <div>
              <FieldLabel>Role Utama</FieldLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {['merchant', 'affiliate', 'superadmin'].map(r => (
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

      {modal && modal !== 'create' && modal !== 'downlines' && modal !== 'bulk-notify' && (
        <Modal title="User Security & Access" onClose={() => setModal(null)} wide>
          <style>{`
            .user-modal-grid {
              display: grid;
              grid-template-columns: 1.2fr 1fr;
              gap: 28px;
            }
            .user-modal-left {
              border-right: 1px solid #e2e8f0;
              padding-right: 28px;
              display: flex;
              flex-direction: column;
              gap: 20px;
            }
            @media (max-width: 820px) {
              .user-modal-grid {
                grid-template-columns: 1fr;
                gap: 24px;
              }
              .user-modal-left {
                border-right: none;
                border-bottom: 1px solid #e2e8f0;
                padding-right: 0;
                padding-bottom: 24px;
              }
            }
          `}</style>
          <div className="user-modal-grid">
            {/* LEFT COLUMN: Profile & Biodata */}
            <div className="user-modal-left">
              {/* Profile Card Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px', background: '#f8fafc', borderRadius: 16, border: '1px solid #f1f5f9' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 14, flexShrink: 0,
                  background: (modal.role === 'admin' || modal.role === 'superadmin') ? 'linear-gradient(135deg,#1e293b,#0f172a)' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 900, fontSize: 24,
                  boxShadow: '0 4px 12px rgba(99,102,241,0.2)'
                }}>
                  {(modal.profile?.full_name || modal.email || '?').charAt(0).toUpperCase()}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 17, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {modal.profile?.full_name || 'Tanpa Nama'}
                  </div>
                  <div style={{ fontSize: 12.5, color: '#64748b', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {modal.email}
                  </div>
                  <span style={roleBadge(modal.role)}>{modal.role}</span>
                </div>
              </div>

              {/* Biodata Fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', paddingBottom: 6 }}>
                  Biodata Pengguna
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <span style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 700 }}>JENIS KELAMIN</span>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#334155', marginTop: 3 }}>
                      {modal.profile?.gender || '—'}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 700 }}>TANGGAL LAHIR</span>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#334155', marginTop: 3 }}>
                      {modal.profile?.date_of_birth ? fmtDate(modal.profile.date_of_birth) : '—'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <span style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 700 }}>POIN REWARD</span>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#10b981', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <i className="bx bxs-star" /> {modal.profile?.reward_points || 0} Poin
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 700 }}>NO. TELEPON (PROFIL)</span>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#334155', marginTop: 3 }}>
                      {modal.profile?.phone || modal.phone || '—'}
                    </div>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 700 }}>ALAMAT LENGKAP</span>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginTop: 4, lineHeight: 1.4 }}>
                    {modal.profile?.address || 'Belum mengisi alamat'}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <span style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 700 }}>KECAMATAN</span>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginTop: 3 }}>
                      {modal.profile?.district || '—'}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 700 }}>KOTA / KABUPATEN</span>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginTop: 3 }}>
                      {modal.profile?.city || '—'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <span style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 700 }}>PROVINSI</span>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginTop: 3 }}>
                      {modal.profile?.province || '—'}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 700 }}>KODE POS</span>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginTop: 3 }}>
                      {modal.profile?.zip_code || '—'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', paddingBottom: 6 }}>
                Akses & Keamanan
              </div>

              {/* Phone Field CRUD */}
              <div>
                <FieldLabel>Nomor Telepon (Akun)</FieldLabel>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input 
                    style={{ ...A.input, flex: 1, height: 42, background: '#fff', fontSize: 13.5 }} 
                    type="text" 
                    value={modal.phone || ''} 
                    onChange={e => setModal({ ...modal, phone: e.target.value })} 
                    placeholder="Masukkan nomor telepon" 
                  />
                  <button 
                    onClick={() => updateUser(modal.id, modal.status, modal.role, modal.phone, modal.admin_role)}
                    style={{ ...A.btnPrimary, height: 42, padding: '0 16px', borderRadius: 10 }}
                  >
                    Simpan
                  </button>
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <FieldLabel>Ubah Role Utama</FieldLabel>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {['merchant', 'affiliate', 'superadmin'].map(r => (
                    <button key={r}
                      onClick={() => updateUser(modal.id, modal.status, r, modal.phone, modal.admin_role)}
                      style={{
                        padding: '10px 4px', borderRadius: 10, border: '1px solid',
                        borderColor: modal.role === r ? '#6366f1' : '#e2e8f0',
                        background: modal.role === r ? '#eef2ff' : '#fff',
                        color: modal.role === r ? '#6366f1' : '#475569',
                        fontWeight: 700, fontSize: 11, textTransform: 'capitalize', cursor: 'pointer',
                        transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                      }}
                    >
                      <i className={`bx ${r === 'superadmin' ? 'bx-crown' : r === 'merchant' ? 'bx-store' : 'bx-link'}`} />
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Selector */}
              <div>
                <FieldLabel>Status Otorisasi</FieldLabel>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[
                    { val: 'active', bg: '#ecfdf5', color: '#10b981', label: 'Aktif', border: '#a7f3d0' },
                    { val: 'suspended', bg: '#fffbeb', color: '#f59e0b', label: 'Suspend', border: '#fde68a' },
                    { val: 'banned', bg: '#fef2f2', color: '#ef4444', label: 'Banned', border: '#fca5a5' },
                  ].map(s => (
                    <button key={s.val}
                      onClick={() => updateUser(modal.id, s.val, modal.role, modal.phone, modal.admin_role)}
                      style={{
                        padding: '10px 4px', borderRadius: 10, border: '1px solid',
                        borderColor: modal.status === s.val ? s.border : '#e2e8f0',
                        background: modal.status === s.val ? s.bg : '#fff',
                        color: modal.status === s.val ? s.color : '#64748b',
                        fontWeight: 700, fontSize: 12, cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Keamanan & Tindakan */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => impersonate(modal.id)}
                    style={{ ...A.btnPrimary, flex: 1, height: 44, justifyContent: 'center', background: '#0f172a', borderRadius: 10, fontSize: 13 }}
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
                    style={{ ...A.btnPrimary, flex: 1, height: 44, justifyContent: 'center', background: '#6366f1', borderRadius: 10, fontSize: 13 }}
                  >
                    <i className="bx bx-key" /> Reset Password
                  </button>
                </div>
                
                <button
                  onClick={() => deleteUser(modal.id)}
                  style={{ 
                    width: '100%', height: 42, borderRadius: 10, border: '1px solid #fee2e2', 
                    background: '#fff5f5', color: '#ef4444', cursor: 'pointer',
                    fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    transition: 'all 0.15s' 
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff5f5'}
                  title="Hapus User"
                >
                  <i className="bx bx-trash" /> Hapus Pengguna Secara Permanen
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
      {modal && modal === 'downlines' && (
        <Modal title={`Jaringan Downline: ${activeUserForDownline?.profile?.full_name}`} onClose={() => setModal(null)} width={600}>
          <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: '10px 4px' }}>
            {downlines.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                <i className="bx bx-info-circle" style={{ fontSize: 40, marginBottom: 12 }} />
                <div style={{ fontWeight: 600 }}>User ini belum memiliki downline (Direct Referral)</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {downlines.map(node => (
                  <DownlineTreeNode key={node.id} node={node} level={0} />
                ))}
              </div>
            )}
          </div>
          <div style={{ marginTop: 20, padding: '12px 16px', background: '#f8fafc', borderRadius: 14, fontSize: 12, color: '#64748b', border: '1px solid #f1f5f9' }}>
            <i className="bx bx-info-circle" style={{ marginRight: 6, color: '#6366f1' }} />
            Menampilkan hingga 10 tingkat kedalaman jaringan afiliasi secara komplit.
          </div>
        </Modal>
      )}
    </div>
  );
}

const DownlineTreeNode = ({ node, level = 0 }) => {
  const [expanded, setExpanded] = useState(level < 1);

  return (
    <div style={{ marginLeft: level > 0 ? 20 : 0, marginBottom: 4 }}>
      <div style={{ 
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', 
        background: level === 0 ? '#fff' : '#fcfcfd', 
        borderRadius: 14, 
        border: '1px solid',
        borderColor: level === 0 ? '#e2e8f0' : '#f1f5f9',
        boxShadow: level === 0 ? '0 2px 8px rgba(0,0,0,0.04)' : 'none'
      }}>
        <div style={{ 
          width: 32, height: 32, borderRadius: 10, 
          background: node.status === 'active' ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : '#e2e8f0', 
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', 
          fontWeight: 800, fontSize: 13, flexShrink: 0
        }}>
            {node.full_name?.charAt(0) || '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {node.full_name}
            </div>
            <div style={{ fontSize: 10.5, color: '#94a3b8', display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ 
                background: '#eef2ff', color: '#6366f1', padding: '1px 6px', borderRadius: 6, 
                fontSize: 9, fontWeight: 900, textTransform: 'uppercase'
              }}>
                Lvl {node.level}
              </span>
              <span style={{ color: '#6366f1', fontWeight: 700 }}>{node.ref_code}</span>
              <span>•</span>
              <span>{node.tier_name || 'No Tier'}</span>
            </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 12, color: '#059669' }}>Rp{node.total_earned.toLocaleString('id-ID')}</div>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>{node.downline_count} Mitra</div>
        </div>
        {node.downlines && node.downlines.length > 0 && (
          <button 
            onClick={() => setExpanded(!expanded)} 
            style={{ 
              background: expanded ? '#eef2ff' : '#f8fafc', 
              border: 'none', 
              color: '#6366f1', 
              cursor: 'pointer',
              width: 28, height: 28, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s'
            }}
          >
            <i className={`bx ${expanded ? 'bx-chevron-up' : 'bx-chevron-down'}`} style={{ fontSize: 18 }} />
          </button>
        )}
      </div>
      {expanded && node.downlines && (
        <div style={{ marginTop: 8, borderLeft: '2px dashed #e2e8f0', marginLeft: 15, paddingLeft: 10 }}>
          {node.downlines.map(child => (
            <DownlineTreeNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};
