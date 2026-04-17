import React, { useState } from 'react';
import { NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { getStoredUser } from '../../lib/auth';

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
  {
    name: 'Users', icon: 'bxs-user-account',
    children: [
      { name: 'All Users', path: '/admin/users' },
      { name: 'Affiliates', path: '/admin/affiliates' },
    ]
  },
  { name: 'Merchants', icon: 'bxs-store-alt', path: '/admin/merchants' },
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
  { name: 'Audit Log', icon: 'bxs-file-find', path: '/admin/audit' },
  { name: 'Security', icon: 'bxs-shield-alt-2', path: '/admin/security' },
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

  if (!user || user.role !== 'superadmin') {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const sideWidth = collapsed ? 70 : C.sideW;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif" }}>

      {/* ─── SIDEBAR ─── */}
      <aside style={{
        width: sideWidth, minHeight: '100vh', background: C.bg,
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
        overflow: 'hidden',
        borderRight: `1px solid ${C.border}`,
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
              <div style={{ fontSize: 15, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' }}>SahabatMart</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Admin Portal</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 10px', scrollbarWidth: 'none' }}>
          {!collapsed ? (
            <>
              <NavItem item={menu[0]} />
              <Label text="People" />
              <NavItem item={menu[1]} />
              <NavItem item={menu[2]} />
              <Label text="Commerce" />
              <NavItem item={menu[3]} />
              <NavItem item={menu[4]} />
              <NavItem item={menu[5]} />
              <Label text="Finance" />
              <NavItem item={menu[6]} />
              <Label text="System" />
              <NavItem item={menu[7]} />
              <NavItem item={menu[8]} />
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginLeft: sideWidth, transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)', minHeight: '100vh' }}>

        {/* Topbar */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 40,
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
            {/* Notification */}
            <div style={{ position: 'relative', cursor: 'pointer' }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, border: '1px solid #e2e8f0',
                background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}>
                <i className="bx bx-bell" style={{ fontSize: 18, color: '#64748b' }} />
              </div>
              <span style={{
                position: 'absolute', top: 6, right: 6, width: 8, height: 8,
                background: '#6366f1', borderRadius: '50%',
                border: '2px solid #f8fafc',
              }} />
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
        nav::-webkit-scrollbar { display: none; }
        * { box-sizing: border-box; }
        .fade-in { animation: fadeIn 0.35s ease forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default AdminLayout;
