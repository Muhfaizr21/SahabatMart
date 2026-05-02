import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { getStoredUser } from '../../lib/auth';
import { fetchJson, MERCHANT_API_BASE } from '../../lib/api';

const SidebarLink = ({ item }) => (
  <NavLink
    to={item.path}
    end={item.end}
    className={({ isActive }) => 
      `flex items-center gap-3 py-3 px-4 rounded-xl transition-all duration-200 group ${
        isActive 
          ? 'text-violet-700 font-bold border-r-4 border-violet-600 bg-white shadow-sm translate-x-1' 
          : 'text-slate-400 hover:text-slate-900 hover:translate-x-1'
      }`
    }
  >
    <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 0" }}>{item.icon}</span>
    <span className="text-[12px] font-bold tracking-wide uppercase">{item.name}</span>
  </NavLink>
);

const MerchantLayout = () => {
  const user = getStoredUser();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    // Click outside handler
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProfileMenu(false);
        setShowNotifMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifs = async () => {
    try {
      const res = await fetchJson(`${MERCHANT_API_BASE}/notifications`);
      if (res && res.status === 'success') {
        setNotifications(res.data || []);
      } else if (Array.isArray(res)) {
        setNotifications(res);
      }
    } catch (err) {
      console.error("Failed to fetch merchant notifs", err);
    }
  };

  useEffect(() => {
    fetchNotifs();
    const timer = setInterval(fetchNotifs, 30000);
    return () => clearInterval(timer);
  }, []);

  // [SahabatMart] Allow both merchants and superadmins (for Pusat warehouse management)
  if (!user || (user.role !== 'merchant' && user.role !== 'superadmin')) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const menuItems = [
    { name: 'Dashboard', icon: 'dashboard', path: '/merchant', end: true },
    { name: 'Mitra Area', icon: 'stars', path: '/affiliate' },
    { name: 'Analytics', icon: 'insights', path: '/merchant/analytics' },
    { name: 'Inventory', icon: 'inventory_2', path: '/merchant/products' },
    { name: 'Restock', icon: 'rebase_edit', path: '/merchant/restock' },
    { name: 'Orders', icon: 'shopping_cart', path: '/merchant/orders' },
    { name: 'Wallet', icon: 'account_balance_wallet', path: '/merchant/wallet' },
    { name: 'Settings', icon: 'settings', path: '/merchant/settings' },
  ];

  return (
    <div className="min-h-screen bg-[#f3f7fb] text-[#171c1f] font-['Plus_Jakarta_Sans'] flex overflow-hidden">
      
      {/* Sidebar Navigation */}
      <aside className={`h-screen w-72 fixed left-0 top-0 overflow-y-auto bg-slate-50 border-r border-slate-200/60 flex flex-col py-8 px-6 space-y-2 z-50 transition-all duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-10 px-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-800 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <span className="material-symbols-outlined text-white">bolt</span>
               </div>
               <div>
                  <span className="text-xl font-black bg-gradient-to-br from-violet-600 to-indigo-800 bg-clip-text text-transparent tracking-tight">AkuGrow</span>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold mt-0.5">Partner Elite</p>
               </div>
            </div>
        </div>

        <nav className="flex-1 space-y-1">
          {menuItems.map((item) => <SidebarLink key={item.path} item={item} />)}
        </nav>

        <div className="mt-auto pt-10 space-y-6">
            <div className="bg-gradient-to-br from-violet-50 to-indigo-50 p-5 rounded-2xl border border-violet-100 relative overflow-hidden group hover:scale-[1.02] transition-all cursor-pointer">
                <div className="relative z-10">
                    <p className="text-[10px] font-black text-violet-600 uppercase tracking-widest mb-1">Elite Benefits</p>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">Nikmati akses prioritas dukungan teknis 24/7.</p>
                </div>
                <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-violet-200/40 rounded-full blur-2xl group-hover:bg-violet-200/60 transition-all"></div>
            </div>
            
            <div className="space-y-1 border-t border-slate-100 pt-6">
                <button className="w-full flex items-center gap-3 py-3 px-4 rounded-xl text-slate-500 hover:text-slate-900 transition-all font-bold text-[11px] tracking-widest uppercase">
                    <span className="material-symbols-outlined text-xl">help</span>
                    Support Center
                </button>
                <button onClick={handleLogout} className="w-full flex items-center gap-3 py-3 px-4 rounded-xl text-slate-400 hover:text-rose-600 font-bold transition-all text-left uppercase text-[11px] tracking-widest">
                    <span className="material-symbols-outlined text-xl">logout</span>
                    Logout
                </button>
            </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarOpen ? 'ml-72' : 'ml-0'}`}>
        
        {/* Top Header Bar */}
        <header className="sticky top-0 right-0 w-full z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex justify-between items-center px-8 h-20">
            <div className="flex items-center gap-6">
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-xl transition-all border border-slate-200 shadow-sm">
                    <span className="material-symbols-outlined text-slate-600">{isSidebarOpen ? 'menu_open' : 'menu'}</span>
                </button>
                <div className="h-6 w-[1px] bg-slate-200"></div>
                <div className="hidden lg:flex items-center gap-2 text-slate-400">
                   <span className="text-[11px] font-black uppercase tracking-widest">Global Escrow Status:</span>
                   <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black border border-emerald-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      OPERATIONAL
                   </span>
                </div>
            </div>

            <div className="flex items-center gap-4" ref={dropdownRef}>
                {/* Notifications */}
                <div className="relative">
                    <button 
                       onClick={() => setShowNotifMenu(!showNotifMenu)}
                       className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all border ${showNotifMenu ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-inner' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 shadow-sm'}`}
                    >
                        <span className="material-symbols-outlined">notifications</span>
                        {/* Dot indicator */}
                        {notifications.filter(n => !n.is_read).length > 0 && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[9px] font-black rounded-full border-2 border-white flex items-center justify-center">
                              {notifications.filter(n => !n.is_read).length}
                          </span>
                        )}
                    </button>

                    {showNotifMenu && (
                        <div className="absolute top-14 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                                <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Notifications</span>
                                <span className="text-[10px] font-bold text-violet-600 cursor-pointer hover:underline">Clear all</span>
                            </div>
                            <div className="max-h-96 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-10 text-center">
                                        <p className="text-xs text-slate-400 font-medium">No new notifications</p>
                                    </div>
                                ) : (
                                    notifications.map(n => (
                                        <div key={n.id} className={`p-4 hover:bg-slate-50 border-b border-slate-50 cursor-pointer transition-colors ${!n.is_read ? 'bg-indigo-50/30' : ''}`}>
                                            <div className="flex gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${n.type === 'order' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                                    <span className="material-symbols-outlined text-sm">{n.type === 'order' ? 'payments' : 'info'}</span>
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-bold text-slate-900 leading-tight">{n.title}</p>
                                                    <p className="text-[10px] text-slate-500 mt-0.5">{n.message}</p>
                                                    <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase tracking-tighter">
                                                        {new Date(n.created_at).toLocaleTimeString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="p-3 bg-slate-50 text-center border-t border-slate-100">
                                <span className="text-[10px] font-black text-slate-400 hover:text-slate-600 cursor-pointer uppercase tracking-widest">See all alerts</span>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="h-10 w-[1px] bg-slate-200 hidden sm:block"></div>

                {/* Profile Toggle */}
                <div className="relative">
                    <div 
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        className={`flex items-center gap-3 pl-4 pr-3 py-2 rounded-2xl border transition-all cursor-pointer select-none ${showProfileMenu ? 'bg-slate-900 border-slate-800 text-white shadow-xl translate-y-[-1px]' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'}`}
                    >
                        <div className="text-right hidden sm:block">
                            <h4 className={`text-xs font-black uppercase tracking-tighter transition-colors ${showProfileMenu ? 'text-white' : 'text-slate-900'}`}>
                                {(user.profile?.full_name?.split(' ')[0] || 'Partner').toUpperCase()}
                            </h4>
                            <p className={`text-[10px] font-bold transition-colors ${showProfileMenu ? 'text-slate-400' : 'text-slate-400'}`}>Official Store</p>
                        </div>
                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-black text-xs shadow-lg border-2 transition-all ${showProfileMenu ? 'bg-white text-slate-900 border-slate-800' : 'bg-gradient-to-br from-violet-600 to-indigo-800 text-white border-white'}`}>
                            {user.profile?.full_name?.charAt(0) || 'M'}
                        </div>
                    </div>

                    {showProfileMenu && (
                        <div className="absolute top-16 right-0 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[100]">
                            <div className="p-4 bg-slate-50/50 border-b border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Authenticated Account</p>
                                <p className="text-xs font-black text-slate-900 truncate">{user.email}</p>
                            </div>
                            <div className="p-2">
                                <button className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-600 hover:bg-slate-50 transition-all text-left">
                                    <span className="material-symbols-outlined text-xl">account_circle</span>
                                    <span className="text-[11px] font-bold uppercase tracking-wider">Public Storefront</span>
                                </button>
                                <button onClick={() => navigate('/merchant/settings')} className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-600 hover:bg-slate-50 transition-all text-left">
                                    <span className="material-symbols-outlined text-xl">tune</span>
                                    <span className="text-[11px] font-bold uppercase tracking-wider">Account Settings</span>
                                </button>
                                <div className="h-[1px] bg-slate-100 my-2 px-3"></div>
                                <button onClick={handleLogout} className="w-full flex items-center gap-3 p-3 rounded-xl text-rose-500 hover:bg-rose-50 transition-all text-left">
                                    <span className="material-symbols-outlined text-xl">logout</span>
                                    <span className="text-[11px] font-bold uppercase tracking-wider">Sign Out</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
            <Outlet />
        </main>
      </div>

      <button 
        onClick={() => navigate('/merchant/restock')}
        className="fixed bottom-10 right-10 w-16 h-16 bg-slate-900 text-white rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 group border-4 border-white/20"
      >
          <span className="material-symbols-outlined text-3xl transition-transform group-hover:rotate-90">rebase_edit</span>
      </button>

      <style>{`
        body { background: #f3f7fb; }
        .fade-in { animation: fadeIn 0.4s ease forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default MerchantLayout;
