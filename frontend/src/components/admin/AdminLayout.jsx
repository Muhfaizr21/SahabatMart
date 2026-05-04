import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { getStoredUser } from '../../lib/auth';
import { fetchJson, ADMIN_API_BASE } from '../../lib/api';

// ─── DESIGN TOKENS ────────────────────────────────────
const C = {
  bg:        '#0f172a',
  bgSub:     '#1e293b',
  bgHover:   '#1e293b',
  accent:    '#6366f1',
  accentGlow:'rgba(99,102,241,0.15)',
  text:      '#f1f5f9',
  muted:     '#64748b',
  border:    'rgba(255,255,255,0.06)',
  sideW:     260,
};

const rawMenu = [
  { type: 'item', name: 'Dashboard', icon: 'bxs-dashboard', path: '/admin', end: true, perm: 'view_dashboard' },

  { type: 'label', text: 'Anggota & Pengguna' },
  {
    type: 'item', name: 'Manajemen User', icon: 'bxs-user-account',
    children: [
      { name: 'Semua Pengguna', path: '/admin/users', perm: 'user_view' },
      { name: 'Daftar Afiliasi', path: '/admin/affiliates', perm: 'affiliate_view' },
      { name: 'Level Keanggotaan', path: '/admin/membership-tiers', perm: 'affiliate_manage_tiers' },
    ]
  },
  {
    type: 'item', name: 'Toko (Merchant)', icon: 'bxs-store-alt',
    children: [
      { name: 'Semua Toko', path: '/admin/merchants', perm: 'merchant_view' },
      { name: 'Permintaan Stok', path: '/admin/merchants/restock', perm: 'inventory_restock' },
    ]
  },

  { type: 'label', text: 'Penjualan & Katalog' },
  { type: 'item', name: 'Kasir (POS)', icon: 'bxs-calculator', path: '/admin/pos', perm: 'order_view' },
  { type: 'item', name: 'Analisis Wishlist', icon: 'bxs-heart', path: '/admin/wishlist', perm: 'view_analytics' },
  {
    type: 'item', name: 'Katalog Produk', icon: 'bxs-package',
    children: [
      { name: 'Gudang Pusat (Stok)', path: '/admin/inventory/pusat', perm: 'inventory_view' },
      { name: 'Semua Produk', path: '/admin/products', perm: 'product_view' },
      { name: 'Kategori Produk', path: '/admin/categories', perm: 'category_view' },
      { name: 'Brand / Merek', path: '/admin/brands', perm: 'product_view' },
      { name: 'Ulasan Produk', path: '/admin/reviews', perm: 'product_view' },
      { name: 'Moderasi Konten', path: '/admin/moderation', perm: 'product_update' },
    ]
  },
  {
    type: 'item', name: 'Pesanan', icon: 'bxs-receipt',
    children: [
      { name: 'Semua Pesanan', path: '/admin/orders', perm: 'order_view' },
      { name: 'Komplain & Sengketa', path: '/admin/disputes', perm: 'order_update_status' },
    ]
  },
  { type: 'item', name: 'Voucher & Promo', icon: 'bxs-coupon', path: '/admin/vouchers', perm: 'marketing_view_voucher' },

  { type: 'label', text: 'Laporan Keuangan' },
  {
    type: 'item', name: 'Keuangan', icon: 'bxs-wallet',
    children: [
      { name: 'Buku Besar (Ledger)', path: '/admin/finance', perm: 'finance_view_summary' },
      { name: 'Aturan Komisi', path: '/admin/commissions', perm: 'finance_view_summary' },
      { name: 'Preset Komisi', path: '/admin/commission-presets', perm: 'finance_view_summary' },
      { name: 'Pencairan Dana', path: '/admin/payouts', perm: 'finance_process_payout' },
    ]
  },

  { type: 'label', text: 'Manajemen Konten' },
  {
    type: 'item', name: 'Konten & Tampilan', icon: 'bxs-layout',
    children: [
      { name: 'Artikel Blog', path: '/admin/blogs', perm: 'content_blog' },
      { name: 'Banner Promo', path: '/admin/banners', perm: 'marketing_manage_banner' },
      { name: 'Edukasi Afiliasi', path: '/admin/education', perm: 'content_education' },
      { name: 'Event Afiliasi', path: '/admin/events', perm: 'content_event' },
      { name: 'Bahan Promosi', path: '/admin/promo', perm: 'content_promo_material' },
    ]
  },

  { type: 'label', text: 'Sistem & Keamanan' },
  {
    type: 'item', name: 'Skin Journey', icon: 'bx-leaf',
    children: [
      { name: 'Monitoring Jurnal', path: '/admin/skin-journey', perm: 'view_analytics' },
    ]
  },
  { type: 'item', name: 'Log Aktivitas', icon: 'bxs-file-find', path: '/admin/audit', perm: 'settings_view' },
  { type: 'item', name: 'Logistik & Kurir', icon: 'bxs-truck', path: '/admin/logistics', perm: 'settings_view' },
  { type: 'item', name: 'Keamanan', icon: 'bxs-shield-alt-2', path: '/admin/security', perm: 'settings_view' },
  { type: 'item', name: 'Pesan Masuk', icon: 'bxs-inbox', path: '/admin/inbox', perm: 'user_view' },
  { type: 'item', name: 'Hak Akses (RBAC)', icon: 'bxs-key', path: '/admin/rbac', perm: 'rbac_view' },
  { type: 'item', name: 'Pengaturan Sistem', icon: 'bxs-cog', path: '/admin/settings', perm: 'settings_view' },
];

// ─── SIDEBAR ITEM ──────────────────────────────────────
const NavItem = ({ item }) => {
  const [open, setOpen] = useState(false);
  const hasChildren = item.children?.length > 0;

  if (!hasChildren) {
    return (
      <NavLink
        to={item.path}
        end={item.end}
        style={({ isActive }) => ({
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 14px', borderRadius: 10, marginBottom: 2,
          cursor: 'pointer', textDecoration: 'none', transition: 'all 0.18s',
          background: isActive ? C.accentGlow : 'transparent',
          color: isActive ? C.accent : C.muted,
          fontWeight: isActive ? 700 : 500,
        })}
      >
        {({ isActive }) => (
          <>
            <i className={`bx ${item.icon}`} style={{ fontSize: 18, color: isActive ? C.accent : C.muted, flexShrink: 0 }} />
            <span style={{ fontSize: 13.5 }}>{item.name}</span>
            {isActive && <div style={{ width: 4, height: 4, borderRadius: '50%', background: C.accent, marginLeft: 'auto' }} />}
          </>
        )}
      </NavLink>
    );
  }

  return (
    <div style={{ marginBottom: 2 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 14px', borderRadius: 10, border: 'none',
          background: 'transparent', cursor: 'pointer', transition: 'all 0.18s',
          color: C.muted,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = C.bgHover; e.currentTarget.style.color = C.text; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.muted; }}
      >
        <i className={`bx ${item.icon}`} style={{ fontSize: 18, flexShrink: 0 }} />
        <span style={{ fontSize: 13.5, fontWeight: 500, flex: 1, textAlign: 'left' }}>{item.name}</span>
        <i className={`bx bx-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: 16 }} />
      </button>
      {open && (
        <div style={{ paddingLeft: 38, paddingTop: 2 }}>
          {item.children.map(child => (
            <NavLink
              key={child.path}
              to={child.path}
              end
              style={({ isActive }) => ({
                display: 'block', padding: '7px 10px', borderRadius: 8, marginBottom: 1,
                textDecoration: 'none', fontSize: 13, transition: 'all 0.15s',
                color: isActive ? C.accent : C.muted,
                fontWeight: isActive ? 700 : 400,
                background: isActive ? C.accentGlow : 'transparent',
              })}
            >
              {child.name}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── LABEL ─────────────────────────────────────────────
const Label = ({ text }) => (
  <div style={{ padding: '12px 14px 4px', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#334155' }}>
    {text}
  </div>
);

// ─── MAIN LAYOUT ───────────────────────────────────────
const AdminLayout = () => {
  const [user, setUser] = useState(getStoredUser());
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [openNotif, setOpenNotif] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const profileRef = React.useRef(null);
  const notifRef = React.useRef(null);

  useEffect(() => {
    // Sync latest user permissions
    const syncUser = async () => {
      try {
        const res = await fetchJson(`${ADMIN_API_BASE.replace('/admin', '/auth')}/me`);
        if (res && res.id) {
          localStorage.setItem('user', JSON.stringify(res));
          setUser(res);
        }
      } catch (err) {
        console.error("Failed to sync user", err);
      }
    };
    syncUser();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setCollapsed(true);
    }
  }, []);

  // Close dropdowns when click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (openNotif && notifRef.current && !notifRef.current.contains(e.target)) {
        setOpenNotif(false);
      }
      if (openProfile && profileRef.current && !profileRef.current.contains(e.target)) {
        setOpenProfile(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openNotif, openProfile]);

  const fetchNotifs = async () => {
    try {
      const data = await fetchJson(`${ADMIN_API_BASE}/notifications`);
      // data is already the array because fetchJson unwraps 'data' property
      if (Array.isArray(data)) {
        setNotifs(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    } catch (err) {
      console.error("Failed to fetch notifs", err);
    }
  };

  useEffect(() => {
    fetchNotifs();
    const timer = setInterval(fetchNotifs, 30000); // Poll every 30s
    return () => clearInterval(timer);
  }, []);

  if (!user || (user.role !== 'superadmin' && user.role !== 'admin')) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  const sideWidth = collapsed ? (isMobile ? 0 : 70) : C.sideW;
  const finalSideWidth = isMobile ? 0 : sideWidth;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif" }}>

      {/* ─── SIDEBAR ─── */}
      <aside style={{
        width: isMobile && collapsed ? 0 : sideWidth, minHeight: '100vh', background: C.bg,
        display: 'flex', flexDirection: 'column',
        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        position: 'fixed', top: 0, 
        left: isMobile && collapsed ? -C.sideW : 0, 
        bottom: 0, zIndex: 10,
        overflow: 'hidden',
        borderRight: `1px solid ${C.border}`,
        boxShadow: isMobile && !collapsed ? '20px 0 50px rgba(0,0,0,0.3)' : 'none',
      }}>

        {/* Brand */}
        <div style={{
          padding: '24px 16px 16px',
          borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          {!collapsed ? (
            <img src="/akuglow.jpg" alt="AkuGlow" style={{ height: 36, width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
          ) : (
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="bx bxs-store" style={{ color: '#fff', fontSize: 18 }} />
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
          {(() => {
            const checkPerm = (code) => {
              if (!user) return false;
              if (user.role === 'superadmin') return true;
              if (!code) return true;
              const perms = user.permissions || [];
              return perms.includes(code) || perms.includes('all');
            };

            const finalMenu = [];
            let lastWasLabel = false;

            rawMenu.forEach((m) => {
              if (m.type === 'label') {
                if (!lastWasLabel) finalMenu.push(m);
                lastWasLabel = true;
              } else if (m.type === 'item') {
                if (m.children) {
                  const allowedChildren = m.children.filter(c => checkPerm(c.perm));
                  if (allowedChildren.length > 0) {
                    finalMenu.push({ ...m, children: allowedChildren });
                    lastWasLabel = false;
                  }
                } else if (checkPerm(m.perm)) {
                  finalMenu.push(m);
                  lastWasLabel = false;
                }
              }
            });

            // Cleanup trailing label
            if (finalMenu.length > 0 && finalMenu[finalMenu.length - 1].type === 'label') {
              finalMenu.pop();
            }

            return finalMenu.map((m, idx) => {
              if (m.type === 'label') {
                // don't render label if collapsed
                return !collapsed ? <Label key={`lbl-${idx}`} text={m.text} /> : null;
              }
              if (collapsed) {
                return (
                  <NavLink
                    key={m.name}
                    to={m.path || (m.children?.[0]?.path) || '#'}
                    title={m.name}
                    style={({ isActive }) => ({
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '10px', borderRadius: 10, marginBottom: 4, textDecoration: 'none',
                      color: isActive ? C.accent : C.muted,
                      background: isActive ? C.accentGlow : 'transparent'
                    })}
                  >
                    <i className={`bx ${m.icon}`} style={{ fontSize: 20 }} />
                  </NavLink>
                );
              }
              return <NavItem key={m.name} item={m} />;
            });
          })()}
        </nav>

        {/* Bottom: User */}
        {!collapsed && (
          <div style={{ padding: '12px 10px', borderTop: `1px solid ${C.border}` }}>
            <button
              onClick={handleLogout}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 10, border: 'none',
                background: 'transparent', cursor: 'pointer', color: C.muted,
                fontSize: 13, fontWeight: 500,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#f87171'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.muted; }}
            >
              <i className="bx bx-log-out" style={{ fontSize: 18 }} />
              Keluar (Logout)
            </button>
          </div>
        )}
      </aside>

      {/* ─── MAIN CONTENT ─── */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        marginLeft: finalSideWidth, 
        transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)', 
        minHeight: '100vh',
        maxWidth: '100%',
        position: 'relative'
      }}>
        {/* Mobile Overlay */}
        {isMobile && !collapsed && (
          <div 
            onClick={() => setCollapsed(true)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 90, backdropFilter: 'blur(2px)' }} 
          />
        )}

        {/* Topbar */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 1,
          height: 64,
          background: 'rgba(248,250,252,0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 32px',
          gap: 16,
        }}>
          {/* Left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={() => setCollapsed(!collapsed)}
              style={{
                width: 36, height: 36, borderRadius: 10, border: '1px solid #e2e8f0',
                background: '#fff', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              <i className={`bx ${collapsed ? 'bx-menu' : 'bx-menu-alt-left'}`} style={{ fontSize: 18, color: '#64748b' }} />
            </button>
            <div style={{ height: 20, width: 1, background: '#e2e8f0' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Control Center
            </span>
          </div>

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Notification Dropdown */}
            <div style={{ position: 'relative' }} ref={notifRef}>
              <button
                id="notif-bell"
                onClick={() => setOpenNotif(!openNotif)}
                style={{
                  width: 36, height: 36, borderRadius: 10, border: '1px solid #e2e8f0',
                  background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)', cursor: 'pointer', position: 'relative'
                }}
              >
                <i className="bx bx-bell" style={{ fontSize: 18, color: '#64748b' }} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18,
                    background: '#ef4444', borderRadius: 9,
                    border: '2px solid #f8fafc', color: 'white', fontSize: 10, fontWeight: 900,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px'
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {openNotif && (
                <div style={{
                  position: 'absolute', top: 48, right: 0, width: 320,
                  background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                  zIndex: 20, overflow: 'hidden'
                }}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>Notifikasi</span>
                    <div style={{ display: 'flex', gap: 12 }}>
                      {unreadCount > 0 && (
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await fetchJson(`${ADMIN_API_BASE}/notifications/read-all`, { method: 'POST' });
                              fetchNotifs();
                            } catch(e){}
                          }}
                          style={{ background: 'none', border: 'none', color: C.accent, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                        >
                          Tandai dibaca
                        </button>
                      )}
                      {notifs.length > 0 && (
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            if(!window.confirm("Hapus semua notifikasi?")) return;
                            try {
                              await fetchJson(`${ADMIN_API_BASE}/notifications/all`, { method: 'DELETE' });
                              fetchNotifs();
                            } catch(e){}
                          }}
                          style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                        >
                          Hapus semua
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ maxHeight: 350, overflowY: 'auto' }}>
                    {notifs.length === 0 ? (
                      <div style={{ padding: '30px 20px', textAlign: 'center', color: '#94a3b8' }}>
                        <i className="bx bx-bell-off" style={{ fontSize: 24, marginBottom: 8, display: 'block' }} />
                        <span style={{ fontSize: 12 }}>Tidak ada notifikasi baru</span>
                      </div>
                    ) : (
                      notifs.map(n => (
                        <div 
                          key={n.id}
                          onClick={async () => {
                            setOpenNotif(false);
                            if (!n.is_read) {
                              try {
                                await fetchJson(`${ADMIN_API_BASE}/notifications/read`, {
                                  method: 'PUT',
                                  body: JSON.stringify({ id: n.id })
                                });
                              } catch(e) {}
                            }
                            navigate(n.link);
                            fetchNotifs();
                          }}
                          style={{
                            padding: '12px 16px', borderBottom: '1px solid #f8fafc',
                            cursor: 'pointer', transition: 'all 0.1s',
                            background: n.is_read ? 'transparent' : '#f5f7ff',
                          }}
                        >
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>{n.title}</div>
                          <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4, marginBottom: 4 }}>{n.message}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>{new Date(n.created_at).toLocaleString()}</div>
                            <button 
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await fetchJson(`${ADMIN_API_BASE}/notifications/delete?id=${n.id}`, { method: 'DELETE' });
                                  fetchNotifs();
                                } catch(e){}
                              }}
                              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px 4px' }}
                              title="Hapus"
                            >
                              <i className="bx bx-trash" style={{ fontSize: 12 }} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Avatar with Dropdown */}
            <div style={{ position: 'relative' }} ref={profileRef}>
              <div 
                onClick={() => setOpenProfile(!openProfile)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '6px 12px 6px 6px', borderRadius: 12,
                  border: '1px solid #e2e8f0', background: '#fff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0,
                }}>
                  {user.profile?.full_name?.charAt(0) || 'A'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div className="hidden sm:block">
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>
                      {user.profile?.full_name?.split(' ')[0] || 'Admin'}
                    </div>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Superadmin</div>
                  </div>
                  <i className={`bx bx-chevron-${openProfile ? 'up' : 'down'}`} style={{ color: '#94a3b8' }} />
                </div>
              </div>

              {openProfile && (
                <div style={{
                  position: 'absolute', top: 48, right: 0, width: 220,
                  background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                  zIndex: 20, overflow: 'hidden'
                }}>
                  <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>System Access</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
                  </div>
                  <div style={{ padding: '6px' }}>
                    <button 
                      onClick={() => navigate('/admin/settings')}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 12px', borderRadius: 8, border: 'none',
                        background: 'transparent', cursor: 'pointer', color: '#475569',
                        fontSize: 13, fontWeight: 500, textAlign: 'left'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <i className="bx bx-cog" style={{ fontSize: 18 }} />
                      Pengaturan Akun
                    </button>
                    <div style={{ height: 1, background: '#f1f5f9', margin: '6px 0' }} />
                    <button 
                      onClick={handleLogout}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 12px', borderRadius: 8, border: 'none',
                        background: 'transparent', cursor: 'pointer', color: '#ef4444',
                        fontSize: 13, fontWeight: 600, textAlign: 'left'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <i className="bx bx-log-out" style={{ fontSize: 18 }} />
                      Keluar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, padding: '32px', overflowX: 'hidden', maxWidth: '100%' }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
        * { box-sizing: border-box; }
        .fade-in { animation: fadeIn 0.35s ease forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default AdminLayout;
