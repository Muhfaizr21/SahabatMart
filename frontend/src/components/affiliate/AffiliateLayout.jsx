import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { getStoredUser } from '../../lib/auth';

const menuItems = [
  { name: 'Insights', icon: 'insert_chart', path: '/affiliate', end: true },
  { name: 'Generate Links', icon: 'link', path: '/affiliate/links' },
  { name: 'Top Produk', icon: 'trending_up', path: '/affiliate/products' },
  { name: 'Komisi', icon: 'payments', path: '/affiliate/commissions' },
  { name: 'Penarikan', icon: 'account_balance_wallet', path: '/affiliate/withdrawals' },
  { name: 'Pengaturan', icon: 'settings', path: '/affiliate/settings' },
];

const SidebarLink = ({ item, collapsed }) => (
  <NavLink
    to={item.path}
    end={item.end}
    className={({ isActive }) =>
      `flex items-center gap-3 py-3 px-4 rounded-xl transition-all duration-200 group relative ${
        isActive
          ? 'bg-gradient-to-r from-purple-500/20 to-transparent text-purple-300 border-l-4 border-purple-400'
          : 'text-slate-400 hover:text-white hover:bg-white/5'
      }`
    }
    title={collapsed ? item.name : ''}
  >
    <span
      className="material-symbols-outlined flex-shrink-0"
      style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}
    >
      {item.icon}
    </span>
    {!collapsed && (
      <span className="text-[13px] font-semibold tracking-wider uppercase whitespace-nowrap">
        {item.name}
      </span>
    )}
  </NavLink>
);

const AffiliateLayout = () => {
  const user = getStoredUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile) setMobileOpen(false);
  }, [location, isMobile]);

  if (!user || user.role !== 'affiliate') {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const affiliateRefCode = user.affiliate_ref_code || user.affiliate?.ref_code || 'SM-REF';
  const tierName = user.affiliate?.membership_tier?.name || 'Bronze';
  const displayName = user.profile?.full_name || user.email || 'Affiliate';
  const initial = displayName.charAt(0).toUpperCase();

  const sidebarContent = (
    <div className="flex flex-col h-full py-8">
      {/* Logo */}
      <div className="px-6 mb-10 flex items-center justify-between">
        <div>
          <span className="text-xl font-extrabold tracking-[0.15em] text-white font-['Plus_Jakarta_Sans']">
            SAHABAT<span className="text-purple-400">MART</span>
          </span>
          <p className="text-[9px] text-slate-500 font-bold tracking-[0.25em] uppercase mt-1">
            Affiliate Portal
          </p>
        </div>
        {!isMobile && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-500 hover:text-white transition-colors p-1"
          >
            <span className="material-symbols-outlined text-lg">
              {sidebarOpen ? 'chevron_left' : 'chevron_right'}
            </span>
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3">
        {menuItems.map((item) => (
          <SidebarLink key={item.path} item={item} collapsed={!sidebarOpen && !isMobile} />
        ))}
      </nav>

      {/* Affiliate ID card */}
      <div className="px-4 mt-6">
        <div className="bg-gradient-to-br from-purple-600/30 to-blue-900/30 backdrop-blur-sm border border-purple-500/20 p-5 rounded-2xl relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl" />
          <p className="text-[9px] font-bold text-purple-400 tracking-[0.2em] uppercase mb-1">
            Kode Referral
          </p>
          <p className="text-base font-black text-white tracking-wider">{affiliateRefCode}</p>
          <p className="text-[10px] text-slate-400 mt-1 capitalize">{tierName} Partner</p>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="px-3 mt-6 space-y-1">
        <button className="w-full flex items-center gap-3 py-3 px-4 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-left">
          <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'wght' 300" }}>help</span>
          {(sidebarOpen || isMobile) && <span className="text-[12px] font-semibold uppercase tracking-wider">Bantuan</span>}
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 py-3 px-4 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-all text-left"
        >
          <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'wght' 300" }}>logout</span>
          {(sidebarOpen || isMobile) && <span className="text-[12px] font-semibold uppercase tracking-wider">Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="min-h-screen flex"
      style={{
        background: '#0c1324',
        color: '#dce1fb',
        fontFamily: "'Manrope', 'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar – desktop */}
      {!isMobile && (
        <aside
          style={{
            width: sidebarOpen ? '260px' : '72px',
            background: 'rgba(21, 27, 45, 0.95)',
            borderRight: '1px solid rgba(77, 67, 84, 0.15)',
            backdropFilter: 'blur(20px)',
            transition: 'width 0.3s ease',
            flexShrink: 0,
          }}
          className="fixed left-0 top-0 h-screen z-30 overflow-hidden"
        >
          {sidebarContent}
        </aside>
      )}

      {/* Sidebar – mobile drawer */}
      {isMobile && (
        <aside
          style={{
            width: '280px',
            background: 'rgba(21, 27, 45, 0.98)',
            borderRight: '1px solid rgba(77, 67, 84, 0.2)',
            backdropFilter: 'blur(20px)',
            transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.3s ease',
          }}
          className="fixed left-0 top-0 h-screen z-50 overflow-y-auto"
        >
          {sidebarContent}
        </aside>
      )}

      {/* Main area */}
      <div
        style={{
          marginLeft: isMobile ? 0 : sidebarOpen ? '260px' : '72px',
          transition: 'margin-left 0.3s ease',
          flex: 1,
          minWidth: 0,
        }}
      >
        {/* Header */}
        <header
          className="sticky top-0 z-20 flex justify-between items-center px-6 h-16"
          style={{
            background: 'rgba(12, 19, 36, 0.8)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(77, 67, 84, 0.15)',
          }}
        >
          <button
            onClick={() => (isMobile ? setMobileOpen(!mobileOpen) : setSidebarOpen(!sidebarOpen))}
            className="p-2 hover:bg-white/5 rounded-xl transition-all text-slate-400 hover:text-white"
          >
            <span className="material-symbols-outlined">
              {(isMobile ? mobileOpen : sidebarOpen) ? 'menu_open' : 'menu'}
            </span>
          </button>

          <div className="flex items-center gap-4">
            {/* Notification dot */}
            <div className="relative">
              <button className="p-2 hover:bg-white/5 rounded-xl transition-all text-slate-400 hover:text-white">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <span className="absolute top-2 right-2 w-2 h-2 bg-purple-400 rounded-full border border-[#0c1324]" />
            </div>

            <div className="h-6 w-px bg-white/10" />

            {/* User info */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-white leading-tight">{displayName}</p>
                <p className="text-[10px] text-purple-400 capitalize">{tierName} Partner</p>
              </div>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg"
                style={{ background: 'linear-gradient(135deg, #b76dff, #7c3aed)' }}
              >
                {initial}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6 md:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AffiliateLayout;
