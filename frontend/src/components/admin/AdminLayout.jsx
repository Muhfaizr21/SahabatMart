import React, { useState } from 'react';
import { NavLink, Outlet, Navigate, useNavigate, Link } from 'react-router-dom';
import { getStoredUser } from '../../lib/auth';

const SidebarItem = ({ item }) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasSubmenu = item.submenu && item.submenu.length > 0;

  if (!hasSubmenu) {
    return (
      <NavLink
        to={item.path}
        end={item.end}
        className={({ isActive }) => 
          `flex items-center gap-3 py-3 px-4 rounded-xl transition-all duration-200 ${
            isActive 
              ? 'text-blue-700 font-bold border-r-4 border-blue-600 bg-white/50 translate-x-1 shadow-sm' 
              : 'text-slate-400 hover:text-slate-900 hover:translate-x-1'
          }`
        }
      >
        <span className="material-symbols-outlined font-light">{item.icon}</span>
        <span className="text-[13px] font-medium tracking-wide uppercase">{item.name}</span>
      </NavLink>
    );
  }

  return (
    <div className="space-y-1">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-3 px-4 rounded-xl text-slate-400 hover:text-slate-900 transition-all group"
      >
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined font-light">{item.icon}</span>
          <span className="text-[13px] font-medium tracking-wide uppercase">{item.name}</span>
        </div>
        <span className={`material-symbols-outlined text-sm transition-transform ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
      </button>
      {isOpen && (
        <div className="pl-10 space-y-1 animate-in slide-in-from-top-2 duration-200">
          {item.submenu.map((sub) => (
            <NavLink
              key={sub.path}
              to={sub.path}
              className={({ isActive }) => 
                `block py-2 text-[12px] font-bold uppercase tracking-widest transition-all ${
                  isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-700'
                }`
              }
            >
              {sub.name}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
};

const AdminLayout = () => {
  const user = getStoredUser();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  if (!user || user.role !== 'superadmin') {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const menuStructure = [
    { name: 'Overview', icon: 'dashboard', path: '/admin', end: true },
    { 
      name: 'User Ecosystem', 
      icon: 'group', 
      submenu: [
        { name: 'Platform Users', path: '/admin/users' },
        { name: 'Affiliate Partners', path: '/admin/affiliates' },
        { name: 'Merchant List', path: '/admin/merchants' }
      ]
    },
    { 
      name: 'Product Catalog', 
      icon: 'inventory_2', 
      submenu: [
        { name: 'Product Index', path: '/admin/products' },
        { name: 'Categories', path: '/admin/categories' },
        { name: 'Brands', path: '/admin/brands' },
        { name: 'Moderation Queue', path: '/admin/moderation' }
      ]
    },
    { 
      name: 'Order Lifecycle', 
      icon: 'receipt_long', 
      submenu: [
        { name: 'Transaction History', path: '/admin/orders' },
        { name: 'Dispute Arbitration', path: '/admin/disputes' }
      ]
    },
    { name: 'Promotions', icon: 'confirmation_number', path: '/admin/vouchers' },
    { 
      name: 'Finance & Audit', 
      icon: 'account_balance_wallet', 
      submenu: [
        { name: 'Financial Ledger', path: '/admin/finance' },
        { name: 'Commission Engine', path: '/admin/commissions' },
        { name: 'Payout Operations', path: '/admin/payouts' }
      ]
    },
    { name: 'Systems Forensic', icon: 'manage_search', path: '/admin/audit' },
    { name: 'Security & Fraud', icon: 'shield_person', path: '/admin/security' },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#1e293b] font-['Plus_Jakarta_Sans'] flex overflow-hidden">
      
      {/* Sidebar Navigation */}
      <aside className={`h-screen w-72 fixed left-0 top-0 overflow-y-auto bg-slate-50 flex flex-col py-8 px-6 space-y-2 z-50 transition-transform duration-300 border-r border-slate-100 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-10 px-2">
            <span className="text-xl font-extrabold bg-gradient-to-br from-blue-600 to-indigo-900 bg-clip-text text-transparent italic tracking-tighter">AdminMart</span>
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-black mt-1">Platform Control</p>
        </div>

        <nav className="flex-1 space-y-1 custom-scrollbar overflow-y-auto">
          {menuStructure.map((item) => <SidebarItem key={item.name} item={item} />)}
        </nav>

        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-2">
            <button className="w-full flex items-center gap-3 py-3 px-4 rounded-xl text-slate-400 hover:text-slate-900 transition-all font-medium">
                <span className="material-symbols-outlined font-light">help_center</span>
                <span className="text-[11px] tracking-wide uppercase">Core Documentation</span>
            </button>
            <button onClick={handleLogout} className="w-full flex items-center gap-3 py-3 px-4 rounded-xl text-slate-400 hover:text-red-600 font-medium transition-all text-left">
                <span className="material-symbols-outlined font-light">logout</span>
                <span className="text-[11px] tracking-wide uppercase">Terminate Session</span>
            </button>
        </div>
      </aside>

      {/* Main Framework Area */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarOpen ? 'ml-72' : 'ml-0'}`}>
        
        {/* Superior Header */}
        <header className="sticky top-0 w-full z-40 bg-white/70 backdrop-blur-xl border-b border-slate-100 flex justify-between items-center px-10 h-20">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2.5 hover:bg-slate-100 rounded-xl transition-all shadow-sm bg-white border border-slate-50">
                  <span className="material-symbols-outlined text-slate-500">{isSidebarOpen ? 'menu_open' : 'menu'}</span>
              </button>
              <div className="h-4 w-[1px] bg-slate-200 mx-2 hidden sm:block"></div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest hidden sm:block">Control Center</h2>
            </div>

            <div className="flex items-center gap-6">
                <div className="relative group p-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-all">
                    <span className="material-symbols-outlined text-slate-400">notifications</span>
                    <span className="absolute top-3 right-3 w-2 h-2 bg-blue-600 rounded-full border-2 border-white animate-pulse"></span>
                </div>
                
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-900 flex items-center justify-center text-white font-black text-sm shadow-xl border-2 border-white">
                    {user.profile?.full_name?.charAt(0) || 'S'}
                </div>
            </div>
        </header>

        {/* Dynamic Canvas */}
        <main className="flex-1 p-12 max-w-full mx-auto w-full overflow-x-hidden">
            <Outlet />
        </main>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default AdminLayout;
