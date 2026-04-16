import React, { useState } from 'react';
import { NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { getStoredUser } from '../../lib/auth';

const SidebarLink = ({ item }) => (
  <NavLink
    to={item.path}
    end={item.end}
    className={({ isActive }) => 
      `flex items-center gap-3 py-3 px-4 rounded-xl transition-all duration-200 group ${
        isActive 
          ? 'text-indigo-700 font-bold border-r-4 border-indigo-600 bg-white/50 translate-x-1 shadow-sm' 
          : 'text-slate-400 hover:text-slate-900 hover:translate-x-1'
      }`
    }
  >
    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>{item.icon}</span>
    <span className="text-[13px] font-medium tracking-wide uppercase">{item.name}</span>
  </NavLink>
);

const AffiliateLayout = () => {
  const user = getStoredUser();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  if (!user || user.role !== 'affiliate') {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const menuItems = [
    { name: 'Insights', icon: 'insights', path: '/affiliate', end: true },
    { name: 'Generate Links', icon: 'link', path: '/affiliate/links' },
    { name: 'Top Products', icon: 'trending_up', path: '/affiliate/products' },
    { name: 'Commissions', icon: 'payments', path: '/affiliate/commissions' },
    { name: 'Withdrawals', icon: 'account_balance_wallet', path: '/affiliate/withdrawals' },
    { name: 'Settings', icon: 'settings', path: '/affiliate/settings' },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#1e293b] font-['Plus_Jakarta_Sans'] selection:bg-indigo-100 selection:text-indigo-700 flex">
      
      {/* Sidebar Navigation */}
      <aside className={`h-screen w-72 fixed left-0 top-0 overflow-y-auto bg-slate-50 flex flex-col py-8 px-6 space-y-2 z-50 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full border-r border-slate-100 flex-shrink-0'}`}>
        <div className="mb-10 px-2 flex items-center justify-between">
            <div>
              <span className="text-xl font-extrabold bg-gradient-to-br from-indigo-600 to-blue-800 bg-clip-text text-transparent italic">SahabatMart</span>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold mt-1">Affiliate Partner</p>
            </div>
        </div>

        <nav className="flex-1 space-y-1">
          {menuItems.map((item) => <SidebarLink key={item.path} item={item} />)}
        </nav>

        <div className="mt-auto space-y-6">
            <div className="bg-gradient-to-br from-indigo-600 to-blue-800 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <p className="text-xs font-bold opacity-80 uppercase tracking-widest mb-1">Affiliate ID</p>
                    <p className="text-xl font-black">{user.affiliate_ref_code || 'N/A'}</p>
                </div>
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
            </div>
            
            <div className="space-y-1">
                <button className="w-full flex items-center gap-3 py-2 px-4 rounded-xl text-slate-400 hover:text-slate-900 transition-all font-medium">
                    <span className="material-symbols-outlined font-light">help</span>
                    <span className="text-[11px] tracking-wide uppercase">Support</span>
                </button>
                <button onClick={handleLogout} className="w-full flex items-center gap-3 py-2 px-4 rounded-xl text-slate-400 hover:text-red-600 font-medium transition-all text-left">
                    <span className="material-symbols-outlined font-light">logout</span>
                    <span className="text-[11px] tracking-wide uppercase">Logout</span>
                </button>
            </div>
        </div>
      </aside>

      {/* Main Area */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarOpen ? 'ml-72' : 'ml-0'}`}>
        
        {/* Header */}
        <header className="sticky top-0 right-0 w-full z-40 bg-white/70 backdrop-blur-xl border-b border-slate-100 flex justify-between items-center px-8 h-20">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                <span className="material-symbols-outlined text-slate-500">{isSidebarOpen ? 'menu_open' : 'menu'}</span>
            </button>

            <div className="flex items-center gap-6">
                <div className="relative group">
                    <span className="material-symbols-outlined text-slate-500 p-2 hover:bg-slate-100/50 rounded-xl transition-all duration-300 cursor-pointer">notifications</span>
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-indigo-600 rounded-full border-2 border-white"></span>
                </div>
                
                <div className="h-8 w-[1px] bg-slate-100"></div>

                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <h4 className="text-xs font-black text-slate-900 leading-tight uppercase tracking-tighter">{user.profile?.full_name || 'Affiliate'}</h4>
                        <p className="text-[10px] font-bold text-slate-400">Bronze Partner</p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-800 flex items-center justify-center text-white font-black text-sm shadow-lg border-2 border-white">
                        {user.profile?.full_name?.charAt(0) || 'A'}
                    </div>
                </div>
            </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-10 max-w-7xl mx-auto w-full">
            <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AffiliateLayout;
