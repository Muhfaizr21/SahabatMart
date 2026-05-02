import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { getStoredUser } from '../../lib/auth';
import { fetchJson, AFFILIATE_API_BASE, API_BASE } from '../../lib/api';

// Menu items sesuai DOKUMEN RESMI Alur Mitra Affiliate Akuglow - Section 2
// Urutan persis sesuai spesifikasi: Dashboard, Merchant Area*, Profil Saya, Omset Tim,
// Pesanan Saya, Status Mitra, Team, Edukasi Bisnis, Leaderboard, Link Affiliate,
// Event Terdekat, Materi Promo, Voucher, Belanja Yuk
// (* Merchant Area muncul dinamis hanya jika role = merchant)
const menuItems = [
  { name: 'Dashboard', icon: 'dashboard', path: '/affiliate', end: true },
  // Merchant Area: injected dynamically for merchant role users (line ~137)
  { name: 'Profil Saya', icon: 'person_outline', path: '/affiliate/settings' },
  { name: 'Omset Tim', icon: 'monitoring', path: '/affiliate/stats' },
  { name: 'Pesanan Saya', icon: 'receipt_long', path: '/profile' }, // Link ke profil buyer (pesanan)
  { name: 'Status Mitra', icon: 'workspace_premium', path: '/affiliate/status' },
  { name: 'Team', icon: 'groups', path: '/affiliate/team' },
  { name: 'Edukasi Bisnis', icon: 'school', path: '/affiliate/education' },
  { name: 'Leaderboard', icon: 'emoji_events', path: '/affiliate/leaderboard' },
  { name: 'Link Affiliate', icon: 'link', path: '/affiliate/links' },
  { name: 'Event Terdekat', icon: 'event', path: '/affiliate/events' },
  { name: 'Materi Promo', icon: 'campaign', path: '/affiliate/marketing' },
  { name: 'Voucher', icon: 'local_offer', path: '/affiliate/vouchers' },
  { name: 'Komunitas', icon: 'forum', path: '/affiliate/community' },
  { name: 'Belanja Yuk', icon: 'shopping_basket', path: '/' },
];

const SidebarLink = ({ item, collapsed }) => (
  <NavLink
    to={item.path}
    end={item.end}
    className={({ isActive }) =>
      `flex items-center gap-3 py-3 px-4 rounded-xl transition-all duration-200 group relative ${isActive
        ? 'active bg-gradient-to-r from-purple-500/20 to-transparent text-purple-300 border-l-4 border-purple-400'
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
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = React.useRef(null);
  const profileRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const fetchNotifs = async () => {
    try {
      const data = await fetchJson(`${AFFILIATE_API_BASE}/notifications`);
      if (Array.isArray(data)) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    } catch (e) {
      console.error('Failed to fetch notifications:', e);
    }
  };

  useEffect(() => {
    fetchNotifs();
    
    // [Akuglow Sync] Real-time SSE Connection
    const affiliateID = user.affiliate?.id || user.id; // Usually affiliate.id is used for pushing
    const sse = new EventSource(`${API_BASE}/api/notifications/stream?user_id=${affiliateID}`);
    
    sse.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === 'notification') {
          fetchNotifs(); // Refresh list on new notif
        }
      } catch (err) {}
    };

    return () => sse.close();
  }, []);

  const markAsRead = async (id) => {
    try {
      await fetchJson(`${AFFILIATE_API_BASE}/notifications/read?id=${id}`, { method: 'POST' });
      fetchNotifs();
    } catch (e) {}
  };

  const markAllAsRead = async () => {
    try {
      await fetchJson(`${AFFILIATE_API_BASE}/notifications/read-all`, { method: 'POST' });
      fetchNotifs();
    } catch (e) {}
  };

  const sidebarRef = React.useRef(null);

  useEffect(() => {
    if (isMobile) setMobileOpen(false);
    
    // Auto-scroll sidebar to active item (Sinkronisasi Scroll)
    setTimeout(() => {
      const activeLink = sidebarRef.current?.querySelector('.active');
      if (activeLink) {
        activeLink.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  }, [location, isMobile]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Per spec: Merchant = Mitra + Merchant. Merchant role users get BOTH areas.
  // Merchant Area link is inserted right after Dashboard for merchant role users.
  const finalMenuItems = [...menuItems];
  if (user.role === 'merchant') {
    finalMenuItems.splice(1, 0, {
      name: 'Merchant Area',
      icon: 'storefront',
      path: '/merchant',
    });
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const affiliateRefCode = user.affiliate_ref_code || user.affiliate?.ref_code || 'AG-REF';
  const tierName = user.affiliate?.membership_tier?.name || 'Bronze';
  const displayName = user.profile?.full_name || user.email || 'Affiliate';
  const initial = displayName.charAt(0).toUpperCase();

  const sidebarContent = (
    <div ref={sidebarRef} className="flex flex-col h-full overflow-y-auto custom-scrollbar">
      {/* Logo */}
      <div className={`px-6 py-8 flex items-center ${(!sidebarOpen && !isMobile) ? 'justify-center' : 'justify-between'} sticky top-0 bg-[#151b2d] z-10 whitespace-nowrap overflow-hidden transition-all duration-300`}>
        {(sidebarOpen || isMobile) ? (
          <div>
            <span className="text-xl font-extrabold tracking-[0.15em] text-white font-['Plus_Jakarta_Sans']">
              AKU<span className="text-purple-400">GROW</span>
            </span>
            <p className="text-[9px] text-slate-500 font-bold tracking-[0.25em] uppercase mt-1">
              Affiliate Portal
            </p>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shrink-0">
            <span className="text-white font-black text-xs">AG</span>
          </div>
        )}
        {!isMobile && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`text-slate-500 hover:text-white transition-colors p-1 ${(!sidebarOpen && !isMobile) ? 'hidden' : 'block'}`}
          >
            <span className="material-symbols-outlined text-lg">
              {sidebarOpen ? 'chevron_left' : 'chevron_right'}
            </span>
          </button>
        )}
      </div>

      {!sidebarOpen && !isMobile && (
        <div className="flex justify-center py-2 mb-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-500 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">menu_open</span>
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 mb-8">
        {finalMenuItems.map((item) => (
          <SidebarLink key={item.path} item={item} collapsed={!sidebarOpen && !isMobile} />
        ))}
      </nav>

      {/* Affiliate ID card */}
      {(sidebarOpen || isMobile) && (
        <div className="px-4 mt-auto mb-6">
          <div className="bg-gradient-to-br from-purple-600/30 to-blue-900/30 backdrop-blur-sm border border-purple-500/20 p-5 rounded-2xl relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl" />
            <p className="text-[9px] font-bold text-purple-400 tracking-[0.2em] uppercase mb-1">
              Kode Referral
            </p>
            <p className="text-base font-black text-white tracking-wider">{affiliateRefCode}</p>
            <p className="text-[10px] text-slate-400 mt-1 capitalize">{tierName} Partner</p>
          </div>
        </div>
      )}

      {/* Bottom actions */}
      <div className="px-3 pb-8 space-y-1">
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
            width: sidebarOpen ? '260px' : '74px',
            background: 'rgba(21, 27, 45, 0.95)',
            borderRight: '1px solid rgba(77, 67, 84, 0.15)',
            backdropFilter: 'blur(20px)',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            flexShrink: 0,
          }}
          className="fixed left-0 top-0 h-screen z-30"
        >
          {sidebarContent}
        </aside>
      )}

      {/* Sidebar – mobile drawer */}
      {isMobile && (
        <aside
          style={{
            width: '280px',
            background: 'rgba(21, 27, 45, 1)',
            borderRight: '1px solid rgba(77, 67, 84, 0.2)',
            backdropFilter: 'blur(20px)',
            transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          className="fixed left-0 top-0 h-screen z-50 shadow-2xl"
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
            {/* Notification system */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setNotifOpen(!notifOpen)}
                className={`p-2 rounded-xl transition-all ${notifOpen ? 'bg-purple-500/20 text-purple-300' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                <span className="material-symbols-outlined">notifications</span>
              </button>
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-purple-400 rounded-full border border-[#0c1324] animate-pulse" />
              )}

              {/* Notification Dropdown */}
              {notifOpen && (
                <>
                  <div className="absolute right-0 mt-3 w-80 bg-[#1a2235] border border-white/10 rounded-2xl shadow-2xl z-20 overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-5 py-4 border-bottom border-white/5 bg-white/5 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold text-white uppercase tracking-wider">Notifikasi</span>
                        {unreadCount > 0 && (
                          <span className="bg-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          markAllAsRead();
                        }}
                        className="text-[10px] font-bold text-purple-400 hover:text-purple-300 transition-colors uppercase tracking-tight"
                      >
                        Tandai Semua Dibaca
                      </button>
                    </div>
                    
                    <div className="max-h-[380px] overflow-y-auto custom-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="p-10 text-center">
                          <span className="material-symbols-outlined text-slate-600 text-4xl mb-2">notifications_off</span>
                          <p className="text-slate-500 text-xs">Belum ada notifikasi</p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div 
                            key={n.id}
                            onClick={() => {
                              markAsRead(n.id);
                              setNotifOpen(false);
                              if (n.link) navigate(n.link);
                            }}
                            className={`px-5 py-4 border-b border-white/5 cursor-pointer transition-all hover:bg-white/5 group ${!n.is_read ? 'bg-purple-500/5' : ''}`}
                          >
                            <div className="flex gap-3">
                              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.is_read ? 'bg-purple-400' : 'bg-transparent'}`} />
                              <div className="flex-1 min-w-0">
                                <p className={`text-[12px] leading-tight mb-1 ${!n.is_read ? 'text-white font-bold' : 'text-slate-300 font-medium'}`}>
                                  {n.title}
                                </p>
                                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed group-hover:text-slate-300">
                                  {n.message}
                                </p>
                                <p className="text-[9px] text-slate-500 mt-2 font-semibold uppercase tracking-tighter">
                                  {new Date(n.created_at).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    
                    <div className="p-3 bg-white/5 border-t border-white/5">
                      <button className="w-full py-2 text-[10px] font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-widest">
                        Lihat Semua
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="h-6 w-px bg-white/10" />

            {/* User info with Dropdown */}
            <div className="relative" ref={profileRef}>
              <div 
                onClick={() => setProfileOpen(!profileOpen)}
                className={`flex items-center gap-3 p-1.5 pr-3 rounded-2xl transition-all cursor-pointer select-none ${profileOpen ? 'bg-white/10 ring-1 ring-white/20' : 'hover:bg-white/5'}`}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg border border-white/10"
                  style={{ background: 'linear-gradient(135deg, #b76dff, #7c3aed)' }}
                >
                  {initial}
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-white leading-tight">{displayName}</p>
                  <div className="flex items-center justify-end gap-1">
                    <p className="text-[10px] text-purple-400 capitalize font-medium">{tierName} Partner</p>
                    <span className={`material-symbols-outlined text-[12px] text-slate-500 transition-transform duration-300 ${profileOpen ? 'rotate-180' : ''}`}>expand_more</span>
                  </div>
                </div>
              </div>

              {/* Profile Dropdown */}
              {profileOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-[#1a2235] border border-white/10 rounded-2xl shadow-2xl z-20 overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-4 bg-white/5 border-b border-white/5">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Akun Terhubung</p>
                    <p className="text-xs font-bold text-white truncate">{user.email}</p>
                  </div>
                  <div className="p-2">
                    <button 
                      onClick={() => {
                        setProfileOpen(false);
                        navigate('/affiliate/settings');
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-all text-left"
                    >
                      <span className="material-symbols-outlined text-lg">account_circle</span>
                      <span className="text-[11px] font-bold uppercase tracking-wider">Profil Saya</span>
                    </button>
                    <button 
                      onClick={() => {
                        setProfileOpen(false);
                        navigate('/profile');
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-all text-left"
                    >
                      <span className="material-symbols-outlined text-lg">shopping_basket</span>
                      <span className="text-[11px] font-bold uppercase tracking-wider">Halaman Buyer</span>
                    </button>
                    
                    <div className="h-[1px] bg-white/5 my-2 mx-3" />
                    
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 p-3 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-all text-left group"
                    >
                      <span className="material-symbols-outlined text-lg">logout</span>
                      <span className="text-[11px] font-bold uppercase tracking-wider">Keluar Sesi</span>
                    </button>
                  </div>
                </div>
              )}
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
