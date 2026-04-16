import React, { useState } from 'react';
import { NavLink, Outlet, Navigate, useNavigate, Link } from 'react-router-dom';
import { getStoredUser } from '../../lib/auth';

const SidebarLink = ({ item }) => (
  <NavLink
    to={item.path}
    end={item.end}
    className={({ isActive }) => 
      `flex items-center gap-3 py-3 px-4 rounded-xl transition-all duration-200 group ${
        isActive 
          ? 'text-violet-700 font-bold border-r-4 border-violet-600 bg-white/50 translate-x-1 shadow-sm' 
          : 'text-slate-400 hover:text-slate-900 hover:translate-x-1'
      }`
    }
  >
    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>{item.icon}</span>
    <span className="text-[13px] font-medium tracking-wide uppercase">{item.name}</span>
  </NavLink>
);

const MerchantLayout = () => {
  const user = getStoredUser();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  if (!user || user.role !== 'merchant') {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const menuItems = [
    { name: 'Dashboard', icon: 'dashboard', path: '/merchant', end: true },
    { name: 'Analytics', icon: 'insights', path: '/merchant/analytics' },
    { name: 'Inventory', icon: 'inventory_2', path: '/merchant/products' },
    { name: 'Orders', icon: 'shopping_cart', path: '/merchant/orders' },
    { name: 'Wallet', icon: 'account_balance_wallet', path: '/merchant/wallet' },
    { name: 'Vouchers', icon: 'confirmation_number', path: '/merchant/vouchers' },
    { name: 'Settings', icon: 'settings', path: '/merchant/settings' },
  ];

  return (
    <div className="min-h-screen bg-[#f6fafe] text-[#171c1f] font-['Plus_Jakarta_Sans'] selection:bg-indigo-100 selection:text-indigo-700 flex">
      
      {/* Sidebar Navigation */}
      <aside className={`h-screen w-72 fixed left-0 top-0 overflow-y-auto bg-slate-50 flex flex-col py-8 px-6 space-y-2 z-50 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full border-r border-slate-100 flex-shrink-0'}`}>
        <div className="mb-10 px-2 flex items-center justify-between">
            <div>
              <span className="text-xl font-extrabold bg-gradient-to-br from-violet-600 to-indigo-800 bg-clip-text text-transparent italic">SahabatMart</span>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold mt-1">Merchant Partner</p>
            </div>
        </div>

        <nav className="flex-1 space-y-1">
          {menuItems.map((item) => <SidebarLink key={item.path} item={item} />)}
        </nav>

        <div className="mt-auto space-y-6">
            {/* Promo Card */}
            <div className="bg-gradient-to-br from-violet-600 to-indigo-800 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <p className="text-xs font-bold opacity-80 uppercase tracking-widest mb-1">Scale Up</p>
                    <p className="text-[10px] leading-relaxed opacity-70">Kelola pesanan dan stok dengan lebih efisien.</p>
                </div>
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
            </div>
            
            {/* Secondary Actions */}
            <div className="space-y-1">
                <button className="w-full flex items-center gap-3 py-2 px-4 rounded-xl text-slate-400 hover:text-slate-900 transition-all font-medium">
                    <span className="material-symbols-outlined">help</span>
                    <span className="text-[11px] tracking-wide uppercase">Help Center</span>
                </button>
                <button onClick={handleLogout} className="w-full flex items-center gap-3 py-2 px-4 rounded-xl text-slate-400 hover:text-red-600 font-medium transition-all text-left">
                    <span className="material-symbols-outlined">logout</span>
                    <span className="text-[11px] tracking-wide uppercase">Logout</span>
                </button>
            </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarOpen ? 'ml-72' : 'ml-0'}`}>
        
        {/* Top Header Bar */}
        <header className="sticky top-0 right-0 w-full z-40 bg-white/70 backdrop-blur-xl shadow-[0_20px_40px_rgba(109,40,217,0.06)] flex justify-between items-center px-8 h-20">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                <span className="material-symbols-outlined text-slate-500">{isSidebarOpen ? 'menu_open' : 'menu'}</span>
            </button>

            <div className="flex items-center gap-6">
                <div className="relative group">
                    <span className="material-symbols-outlined text-slate-500 p-2 hover:bg-slate-100/50 rounded-xl transition-all duration-300 cursor-pointer">notifications</span>
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-violet-600 rounded-full border-2 border-white"></span>
                </div>
                
                <div className="h-8 w-[1px] bg-slate-100"></div>

                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <h4 className="text-xs font-black text-slate-900 leading-tight uppercase tracking-tighter">{user.profile?.full_name || 'Merchant'}</h4>
                        <p className="text-[10px] font-bold text-slate-400">Official Partner</p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-800 flex items-center justify-center text-white font-black text-sm shadow-lg border-2 border-white shadow-indigo-100">
                        {user.profile?.full_name?.charAt(0) || 'M'}
                    </div>
                </div>
            </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 p-10 max-w-7xl mx-auto w-full">
            <Outlet />
        </main>
      </div>

      {/* Persistent Add FAB */}
      <button 
        onClick={() => navigate('/merchant/products/add')}
        className="fixed bottom-10 right-10 w-16 h-16 bg-slate-900 text-white rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 group border-4 border-white/20"
      >
          <span className="material-symbols-outlined text-3xl transition-transform group-hover:rotate-90">add</span>
      </button>
    </div>
  );
};

export default MerchantLayout;
