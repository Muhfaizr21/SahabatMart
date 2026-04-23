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

// ─── MENU STRUCTURE ────────────────────────────────────
const menu = [
  { name: 'Dashboard', icon: 'bxs-dashboard', path: '/admin', end: true },
  { name: 'Point of Sale', icon: 'bxs-calculator', path: '/admin/pos' },
  { name: 'Wishlist Insights', icon: 'bxs-heart', path: '/admin/wishlist' },
  {
    name: 'Users', icon: 'bxs-user-account',
    children: [
      { name: 'All Users', path: '/admin/users' },
      { name: 'Affiliates', path: '/admin/affiliates' },
    ]
  },
  {
    name: 'Merchants', icon: 'bxs-store-alt',
    children: [
      { name: 'All Merchants', path: '/admin/merchants' },
      { name: 'Restock Requests', path: '/admin/merchants/restock' },
    ]
  },
  {
    name: 'Catalog', icon: 'bxs-package',
    children: [
      { name: 'Products', path: '/admin/products' },
      { name: 'Categories', path: '/admin/categories' },
      { name: 'Brands', path: '/admin/brands' },
      { name: 'Moderation', path: '/admin/moderation' },
    ]
  },
  {
    name: 'Orders', icon: 'bxs-receipt',
    children: [
      { name: 'All Orders', path: '/admin/orders' },
      { name: 'Disputes', path: '/admin/disputes' },
    ]
  },
  { name: 'Vouchers', icon: 'bxs-coupon', path: '/admin/vouchers' },
  {
    name: 'Finance', icon: 'bxs-wallet',
    children: [
      { name: 'Ledger', path: '/admin/finance' },
      { name: 'Commissions', path: '/admin/commissions' },
      { name: 'Payouts', path: '/admin/payouts' },
    ]
  },
  {
    name: 'CMS & Layout', icon: 'bxs-layout',
    children: [
      { name: 'Blog Posts', path: '/admin/blogs' },
      { name: 'Banner Hero', path: '/admin/banners' },
      { name: 'Affiliate Education', path: '/admin/education' },
      { name: 'Affiliate Events', path: '/admin/events' },
      { name: 'Promo Materials', path: '/admin/promo' },
    ]
  },
  { name: 'Audit Log', icon: 'bxs-file-find', path: '/admin/audit' },
  { name: 'Security', icon: 'bxs-shield-alt-2', path: '/admin/security' },
  { name: 'Inbox', icon: 'bxs-inbox', path: '/admin/inbox' },
  { name: 'RBAC Access', icon: 'bxs-key', path: '/admin/rbac' },
  { name: 'Platform Settings', icon: 'bxs-cog', path: '/admin/settings' },
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
  const user = getStoredUser();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [openNotif, setOpenNotif] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setCollapsed(true);
    }
  }, []);

  // Close notif when click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (openNotif && !e.target.closest('.notif-wrapper')) {
        setOpenNotif(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openNotif]);

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

  if (!user || user.role !== 'superadmin') {
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
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="bx bxs-store" style={{ color: '#fff', fontSize: 18 }} />
          </div>
          {!collapsed && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' }}>AkuGrow</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Admin Portal</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
          {!collapsed ? (
            <>
              <NavItem item={menu[0]} />
              <Label text="People" />
              <NavItem item={menu[3]} />
              <NavItem item={menu[4]} />
              <Label text="Commerce" />
              <NavItem item={menu[1]} />
              <NavItem item={menu[2]} />
              <NavItem item={menu[5]} />
              <NavItem item={menu[6]} />
              <NavItem item={menu[7]} />
              <Label text="Finance" />
              <NavItem item={menu[8]} />
              <Label text="Content & CMS" />
              <NavItem item={menu[9]} />
              <Label text="System" />
              <NavItem item={menu[10]} />
              <NavItem item={menu[11]} />
              <NavItem item={menu[12]} />
              <NavItem item={menu[13]} />
              <NavItem item={menu[14]} />
            </>
          ) : (
            menu.map(item => (
              <NavLink
                key={item.name}
                to={item.path || (item.children?.[0]?.path) || '#'}
                title={item.name}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', borderRadius: 10, marginBottom: 4, textDecoration: 'none', color: C.muted }}
              >
                <i className={`bx ${item.icon}`} style={{ fontSize: 20 }} />
              </NavLink>
            ))
          )}
        </nav>

        {/* Bottom: User */}
        {!collapsed && (
          <div style={{ padding: '12px 10px', borderTop: `1px solid ${C.border}` }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 12,
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${C.border}`, marginBottom: 8,
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 800, color: '#fff',
              }}>
                {user.profile?.full_name?.charAt(0) || 'A'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.profile?.full_name || 'Super Admin'}
                </div>
                <div style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>superadmin</div>
              </div>
            </div>
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
              Logout
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
            <div style={{ position: 'relative' }} className="notif-wrapper">
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
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>Notifications</span>
                    {unreadCount > 0 && (
                      <button 
                        onClick={async () => {
                          try {
                            await fetchJson(`${ADMIN_API_BASE}/notifications/read-all`, { method: 'POST' });
                            fetchNotifs();
                          } catch(e){}
                        }}
                        style={{ background: 'none', border: 'none', color: C.accent, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div style={{ maxHeight: 350, overflowY: 'auto' }}>
                    {notifs.length === 0 ? (
                      <div style={{ padding: '30px 20px', textAlign: 'center', color: '#94a3b8' }}>
                        <i className="bx bx-bell-off" style={{ fontSize: 24, marginBottom: 8, display: 'block' }} />
                        <span style={{ fontSize: 12 }}>No new notifications</span>
                      </div>
                    ) : (
                      notifs.map(n => (
                        <div 
                          key={n.id}
                          onClick={() => {
                            setOpenNotif(false);
                            navigate(n.link);
                          }}
                          style={{
                            padding: '12px 16px', borderBottom: '1px solid #f8fafc',
                            cursor: 'pointer', transition: 'all 0.1s',
                            background: n.is_read ? 'transparent' : '#f5f7ff',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={e => e.currentTarget.style.background = n.is_read ? 'transparent' : '#f5f7ff'}
                        >
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>{n.title}</div>
                          <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4, marginBottom: 4 }}>{n.message}</div>
                          <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>{new Date(n.created_at).toLocaleString()}</div>
                        </div>
                      ))
                    )}
                  </div>
                  <div style={{ padding: '10px', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
                    <button style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      View all activities
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Avatar */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '6px 12px 6px 6px', borderRadius: 12,
              border: '1px solid #e2e8f0', background: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              cursor: 'pointer',
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0,
              }}>
                {user.profile?.full_name?.charAt(0) || 'A'}
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>
                  {user.profile?.full_name?.split(' ')[0] || 'Admin'}
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Superadmin</div>
              </div>
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
