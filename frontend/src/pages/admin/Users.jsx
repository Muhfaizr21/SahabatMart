import React, { useState, useEffect, useCallback } from 'react';
import { ADMIN_API_BASE, AUTH_API_BASE, fetchJson } from '../../lib/api';
import { PageHeader, StatRow, TablePanel, Modal, FieldLabel, statusBadge, roleBadge, fmtDate, fmtRelativeTime, A } from '../../lib/adminStyles.jsx';

const API = ADMIN_API_BASE;

const CustomSelect = ({ label, value, options, onChange, icon }) => {
  const [open, setOpen] = useState(false);
  const ref = React.useRef();

  useEffect(() => {
    const clickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  const selectedOption = options.find(o => String(o.value) === String(value));

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', borderRadius: 12,
          border: '1px solid #e2e8f0', background: '#fff',
          fontSize: 13, fontWeight: 600, color: '#334155',
          cursor: 'pointer', outline: 'none', transition: 'all 0.2s',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = '#6366f1'}
        onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
        onClick={() => setOpen(!open)}
      >
        {icon && <i className={`bx ${icon}`} style={{ fontSize: 16, color: '#6366f1' }} />}
        <span>{label}: <strong>{selectedOption ? selectedOption.label : 'Semua'}</strong></span>
        <i className="bx bx-chevron-down" style={{ fontSize: 14, color: '#94a3b8', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 150,
          background: '#fff', border: '1px solid #f1f5f9', borderRadius: 12,
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)',
          minWidth: 180, overflow: 'hidden', padding: 4,
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8,
                border: 'none', background: String(value) === String(opt.value) ? '#f5f3ff' : 'transparent',
                color: String(value) === String(opt.value) ? '#6366f1' : '#475569',
                fontSize: 12.5, fontWeight: String(value) === String(opt.value) ? 700 : 500,
                textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                if (String(value) !== String(opt.value)) {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.color = '#0f172a';
                }
              }}
              onMouseLeave={e => {
                if (String(value) !== String(opt.value)) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#475569';
                }
              }}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const SearchableSelect = ({ label, value, options, onChange, placeholder = "Cari..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = React.useRef();

  useEffect(() => {
    const clickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  const filtered = options.filter(opt => 
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find(o => String(o.value) === String(value));

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '11px 16px', borderRadius: 11, border: '1px solid #e2e8f0',
          fontSize: 13.5, color: '#334155', background: '#fff',
          cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)', boxSizing: 'border-box'
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = '#6366f1'}
        onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginRight: 8 }}>
          {selectedOption ? selectedOption.label : '-- Tanpa Upline --'}
        </span>
        <i className="bx bx-chevron-down" style={{ fontSize: 16, color: '#94a3b8', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 1000,
          background: '#fff', border: '1px solid #f1f5f9', borderRadius: 12,
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)', padding: 8,
          maxHeight: 250, display: 'flex', flexDirection: 'column', gap: 6,
          boxSizing: 'border-box'
        }}>
          <input 
            type="text"
            style={{
              padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
              fontSize: 12.5, outline: 'none', background: '#f8fafc', boxSizing: 'border-box', width: '100%',
              fontFamily: "'Inter', sans-serif"
            }}
            placeholder={placeholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onClick={e => e.stopPropagation()}
            autoFocus
          />
          <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
            <div
              onClick={() => { onChange(''); setIsOpen(false); setSearch(''); }}
              style={{
                padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                background: !value ? '#f5f3ff' : 'transparent',
                color: !value ? '#6366f1' : '#475569',
                fontSize: 12.5, fontWeight: !value ? 700 : 500,
              }}
              onMouseEnter={e => {
                if (value) e.currentTarget.style.background = '#f8fafc';
              }}
              onMouseLeave={e => {
                if (value) e.currentTarget.style.background = 'transparent';
              }}
            >
              -- Tanpa Upline --
            </div>
            {filtered.length === 0 ? (
              <div style={{ padding: '8px 12px', fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                Tidak ditemukan
              </div>
            ) : filtered.map(opt => (
              <div
                key={opt.value}
                onClick={() => { onChange(opt.value); setIsOpen(false); setSearch(''); }}
                style={{
                  padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                  background: String(value) === String(opt.value) ? '#f5f3ff' : 'transparent',
                  color: String(value) === String(opt.value) ? '#6366f1' : '#475569',
                  fontSize: 12.5, fontWeight: String(value) === String(opt.value) ? 700 : 500,
                }}
                onMouseEnter={e => {
                  if (String(value) !== String(opt.value)) e.currentTarget.style.background = '#f8fafc';
                }}
                onMouseLeave={e => {
                  if (String(value) !== String(opt.value)) e.currentTarget.style.background = 'transparent';
                }}
              >
                {opt.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  
  // Advanced Filters & Pagination
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [order, setOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  
  const [modal, setModal] = useState(null);
  const [newUserData, setNewUserData] = useState({ email: '', password: '', fullName: '', phone: '', role: 'affiliate', upline_code: '' });
  const [saving, setSaving] = useState(false);
  
  const [downlines, setDownlines] = useState([]);
  const [loadingDownlines, setLoadingDownlines] = useState(false);
  const [activeUserForDownline, setActiveUserForDownline] = useState(null);

  // Bulk Notification States
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [bulkTitle, setBulkTitle] = useState('');
  const [bulkMessage, setBulkMessage] = useState('');
  const [eligibleUplines, setEligibleUplines] = useState([]);

  // Fetch eligible uplines on mount & after any load
  const refreshUplines = () => {
    fetchJson(`${API}/users/eligible-uplines`)
      .then(res => {
        const arr = Array.isArray(res) ? res : (res?.data || []);
        setEligibleUplines(arr);
      })
      .catch(console.error);
  };
  useEffect(() => { refreshUplines(); }, []);

  // Reset selected users when filters / page change
  useEffect(() => {
    setSelectedUserIds([]);
  }, [filterRole, filterStatus, search, sortBy, page, limit]);

  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;

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
    if (debouncedSearch) p.append('search', debouncedSearch);
    if (sortBy) p.append('sort', sortBy);
    if (order) p.append('order', order);
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
  }, [filterRole, filterStatus, debouncedSearch, sortBy, order, page, limit]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Trigger load instantly when any filter/sort/pagination state changes
  useEffect(() => {
    load();
  }, [load]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterRole, filterStatus, sortBy, order, limit]);

  const totalPages = Math.ceil(total / limit);

  const updateUser = (userId, status, role, phone, adminRole = '', uplineCode = undefined) => {
    fetchJson(`${API}/users/update`, {
      method: 'PUT',
      body: JSON.stringify({ user_id: userId, status, role, phone, admin_role: adminRole, upline_code: uplineCode }),
    }).then(() => { 
      load(); 
      setModal(null); 
      refreshUplines();
    }).catch(e => alert(e.message));
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
      setNewUserData({ email: '', password: '', fullName: '', phone: '', role: 'affiliate', upline_code: '' });
      refreshUplines();
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
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <CustomSelect 
          label="Role" 
          value={filterRole} 
          icon="bx-user"
          options={[
            { value: '', label: 'Semua Role' },
            { value: 'merchant', label: 'Merchant' },
            { value: 'affiliate', label: 'Affiliate' },
            { value: 'superadmin', label: 'Superadmin' }
          ]}
          onChange={setFilterRole}
        />

        <CustomSelect 
          label="Status" 
          value={filterStatus} 
          icon="bx-toggle-left"
          options={[
            { value: '', label: 'Semua Status' },
            { value: 'active', label: 'Active' },
            { value: 'suspended', label: 'Suspended' },
            { value: 'banned', label: 'Banned' }
          ]}
          onChange={setFilterStatus}
        />

        <CustomSelect 
          label="Urutan" 
          value={sortBy} 
          icon="bx-sort-alt-2"
          options={[
            { value: 'name', label: 'Nama' },
            { value: 'role', label: 'Role' },
            { value: 'status', label: 'Status' },
            { value: 'phone', label: 'No. Telepon' },
            { value: 'last_login', label: 'Login Terakhir' },
            { value: 'created_at', label: 'Terdaftar' }
          ]}
          onChange={setSortBy}
        />

        <CustomSelect 
          label="Arah" 
          value={order} 
          icon="bx-transfer-alt"
          options={[
            { value: 'asc', label: 'ASC' },
            { value: 'desc', label: 'DESC' }
          ]}
          onChange={setOrder}
        />

        <CustomSelect 
          label="Per Hal" 
          value={String(limit)} 
          icon="bx-list-ol"
          options={[
            { value: '20', label: '20' },
            { value: '50', label: '50' },
            { value: '100', label: '100' }
          ]}
          onChange={(val) => setLimit(parseInt(val))}
        />
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
        {!isMobile ? (
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
                {[
                  { key: 'name', label: 'Pengguna & Identitas', sortable: true, width: 250 },
                  { key: 'phone', label: 'No. Telepon', sortable: true },
                  { key: 'role', label: 'Role', sortable: true },
                  { key: 'status', label: 'Status', sortable: true },
                  { key: 'last_login', label: 'Login Terakhir', sortable: true },
                  { key: 'created_at', label: 'Terdaftar', sortable: true },
                ].map((h) => {
                  const isCurrentSort = sortBy === h.key;
                  return (
                    <th 
                      key={h.key} 
                      style={{ 
                        ...A.th, 
                        width: h.width || 'auto',
                        cursor: h.sortable ? 'pointer' : 'default',
                        userSelect: 'none'
                      }}
                      onClick={() => {
                        if (!h.sortable) return;
                        if (sortBy === h.key) {
                          setOrder(o => o === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy(h.key);
                          setOrder('desc');
                        }
                      }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {h.label}
                        {h.sortable && (
                          <i className={`bx ${
                            isCurrentSort 
                              ? (order === 'asc' ? 'bx-chevron-up' : 'bx-chevron-down') 
                              : 'bx-sort-alt-2'
                          }`} style={{ 
                            fontSize: 13, 
                            color: isCurrentSort ? '#6366f1' : '#94a3b8' 
                          }} />
                        )}
                      </div>
                    </th>
                  );
                })}
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
                    {u.role === 'merchant' && u.merchant && (
                      <div style={{ fontSize: 10, color: '#0891b2', fontWeight: 800, marginTop: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <i className="bx bx-store-alt" />
                        {u.merchant.store_name}
                      </div>
                    )}
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
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 20px' }}>
            {users.length === 0 ? (
              <div style={A.empty}>
                <i className="bx bxs-user-x" style={{ fontSize: 48, color: '#e2e8f0' }} />
                <div style={{ fontWeight: 700, color: '#94a3b8' }}>Tidak ada pengguna yang sesuai filter</div>
              </div>
            ) : users.map((u) => (
              <div key={u.id} style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.01)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                    background: (u.role === 'admin' || u.role === 'superadmin') ? 'linear-gradient(135deg,#1e293b,#0f172a)' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 800, fontSize: 16,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                  }}>
                    {(u.profile?.full_name || u.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {u.profile?.full_name || 'Tanpa Nama'}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#94a3b8', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={A.iconBtn('#ea580c', '#fff7ed')} onClick={() => viewDownlines(u)} title="Lihat Downline" disabled={loadingDownlines}>
                      <i className="bx bx-git-branch" />
                    </button>
                    <button style={A.iconBtn('#6366f1', '#f5f7ff')} onClick={() => setModal(u)} title="Manage User">
                      <i className="bx bx-slider-alt" />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  <span style={roleBadge(u.role)}>{u.role}</span>
                  {u.role === 'merchant' && u.merchant && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#ecfeff', color: '#0891b2', padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 800 }}>
                      <i className="bx bx-store-alt" /> {u.merchant.store_name}
                    </span>
                  )}
                  <span style={statusBadge(u.status)}>{u.status}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12, borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
                  <div>
                    <div style={{ color: '#94a3b8', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', marginBottom: 2 }}>No. Telepon</div>
                    <div style={{ fontWeight: 600, color: '#475569' }}>{u.phone || '—'}</div>
                  </div>
                  <div>
                    <div style={{ color: '#94a3b8', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', marginBottom: 2 }}>Login Terakhir</div>
                    <div style={{ fontWeight: 600, color: '#475569' }}>{fmtRelativeTime(u.last_login_at)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
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
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 12 : 16 }}>
              <div>
                <FieldLabel>Email Address</FieldLabel>
                <input style={A.input} type="email" required value={newUserData.email} onChange={e => setNewUserData({...newUserData, email: e.target.value})} placeholder="email@example.com" />
              </div>
              <div>
                <FieldLabel>Full Name</FieldLabel>
                <input style={A.input} required value={newUserData.fullName} onChange={e => setNewUserData({...newUserData, fullName: e.target.value})} placeholder="Nama Lengkap" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 12 : 16 }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 8 }}>
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

            {(newUserData.role === 'merchant' || newUserData.role === 'affiliate') && (
              <div>
                <FieldLabel>Pilih Upline (Opsional)</FieldLabel>
                <SearchableSelect 
                  placeholder="Cari nama atau kode referral..."
                  value={newUserData.upline_code || ''} 
                  onChange={val => setNewUserData({...newUserData, upline_code: val})} 
                  options={eligibleUplines
                    .filter(u => u.email !== newUserData.email)
                    .map(u => ({
                      value: u.ref_code,
                      label: `${u.full_name} — ${u.email}${u.ref_code && u.ref_code.length < 30 ? ` (${u.ref_code})` : ''}`
                    }))}
                />
              </div>
            )}

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
                  {modal.role === 'merchant' && modal.merchant && (
                    <div style={{ fontSize: 12, color: '#0891b2', fontWeight: 800, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <i className="bx bx-store-alt" />
                      Managed: {modal.merchant.store_name}
                    </div>
                  )}
                </div>
              </div>

              {/* Biodata Fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', paddingBottom: 6 }}>
                  Biodata Pengguna
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 12 : 16 }}>
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

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 12 : 16 }}>
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

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 12 : 16 }}>
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

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 12 : 16 }}>
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

                {/* Display Current Upline */}
                {(modal.role === 'affiliate' || modal.role === 'merchant') && (
                  <div>
                    <span style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 700 }}>UPLINE AKTIF</span>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#6366f1', marginTop: 3 }}>
                      {modal.affiliate?.upline_code ? (() => {
                        const matchedUpline = eligibleUplines.find(u => u.ref_code === modal.affiliate.upline_code);
                        return (
                          <span>
                            <i className="bx bx-user" style={{ marginRight: 4 }} />
                            {matchedUpline ? `${matchedUpline.full_name} (${modal.affiliate.upline_code})` : modal.affiliate.upline_code}
                          </span>
                        );
                      })() : 'Tidak memiliki Upline'}
                    </div>
                  </div>
                )}
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
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 8 }}>
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

              {/* Upline Assignment */}
              {(modal.role === 'affiliate' || modal.role === 'merchant') && (
                <div>
                  <FieldLabel>Pilih Upline</FieldLabel>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <SearchableSelect 
                        placeholder="Cari nama atau kode referral..."
                        value={modal.affiliate?.upline_code || ''} 
                        onChange={val => setModal({ 
                          ...modal, 
                          affiliate: { ...(modal.affiliate || {}), upline_code: val } 
                        })} 
                        options={eligibleUplines
                          .filter(u => u.email !== modal.email)
                          .map(u => ({
                            value: u.ref_code,
                            label: `${u.full_name} — ${u.email}${u.ref_code && u.ref_code.length < 30 ? ` (${u.ref_code})` : ''}`
                          }))}
                      />
                    </div>
                    <button 
                      onClick={() => updateUser(modal.id, modal.status, modal.role, modal.phone, modal.admin_role, modal.affiliate?.upline_code || '')}
                      style={{ ...A.btnPrimary, height: 42, padding: '0 16px', borderRadius: 10, flexShrink: 0 }}
                    >
                      Simpan Upline
                    </button>
                  </div>
                </div>
              )}

              {/* Status Selector */}
              <div>
                <FieldLabel>Status Otorisasi</FieldLabel>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 8 }}>
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
                  <DownlineTreeNode key={node.id} node={node} level={0} isMobile={isMobile} />
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

const DownlineTreeNode = ({ node, level = 0, isMobile }) => {
  const [expanded, setExpanded] = useState(level < 1);
  const indent = level > 0 ? (isMobile ? 10 : 20) : 0;

  return (
    <div style={{ marginLeft: indent, marginBottom: 4 }}>
      <div style={{ 
        display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10, padding: isMobile ? '8px 10px' : '10px 14px', 
        background: level === 0 ? '#fff' : '#fcfcfd', 
        borderRadius: 14, 
        border: '1px solid',
        borderColor: level === 0 ? '#e2e8f0' : '#f1f5f9',
        boxShadow: level === 0 ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
        minWidth: 0
      }}>
        <div style={{ 
          width: isMobile ? 28 : 32, height: isMobile ? 28 : 32, borderRadius: 10, 
          background: node.status === 'active' ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : '#e2e8f0', 
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', 
          fontWeight: 800, fontSize: isMobile ? 11 : 13, flexShrink: 0
        }}>
            {node.full_name?.charAt(0) || '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: isMobile ? 12 : 13, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {node.full_name}
            </div>
            <div style={{ fontSize: isMobile ? 9.5 : 10.5, color: '#94a3b8', display: 'flex', gap: isMobile ? 4 : 6, alignItems: 'center', flexWrap: 'wrap', minWidth: 0 }}>
              <span style={{ 
                background: '#eef2ff', color: '#6366f1', padding: '1px 5px', borderRadius: 6, 
                fontSize: isMobile ? 8 : 9, fontWeight: 900, textTransform: 'uppercase', whiteSpace: 'nowrap'
              }}>
                Lvl {node.level}
              </span>
              <span style={{ color: '#6366f1', fontWeight: 700, fontSize: isMobile ? 9 : 10.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: isMobile ? 70 : 'none' }}>{node.ref_code}</span>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: isMobile ? 60 : 100, fontSize: isMobile ? 9 : 10.5 }}>{node.tier_name || 'No Tier'}</span>
            </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 0, paddingLeft: 4 }}>
            <div style={{ fontWeight: 800, fontSize: isMobile ? 11 : 12, color: '#059669', whiteSpace: 'nowrap' }}>Rp{node.total_earned.toLocaleString('id-ID')}</div>
            <div style={{ fontSize: isMobile ? 9 : 10, color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>{node.downline_count} Mitra</div>
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
              transition: 'all 0.2s',
              flexShrink: 0
            }}
          >
            <i className={`bx ${expanded ? 'bx-chevron-up' : 'bx-chevron-down'}`} style={{ fontSize: 18 }} />
          </button>
        )}
      </div>
      {expanded && node.downlines && (
        <div style={{ marginTop: 8, borderLeft: '2px dashed #e2e8f0', marginLeft: isMobile ? 8 : 15, paddingLeft: isMobile ? 6 : 10 }}>
          {node.downlines.map(child => (
            <DownlineTreeNode key={child.id} node={child} level={level + 1} isMobile={isMobile} />
          ))}
        </div>
      )}
    </div>
  );
};
