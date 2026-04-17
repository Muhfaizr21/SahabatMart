import React, { useState, useEffect } from 'react';
import { fetchJson, BUYER_API_BASE, MERCHANT_API_BASE, formatImage } from '../../lib/api';
import { getStoredUser } from '../../lib/auth';

const MerchantDashboard = () => {
  const user = getStoredUser();
  const [stats, setStats] = useState({
    totalOrders: 0,
    awaitingPayment: 0,
    completed: 0,
    revenue: 0
  });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [ordersData, productsData] = await Promise.all([
          fetchJson(`${MERCHANT_API_BASE}/orders`),
          fetchJson(`${MERCHANT_API_BASE}/products`)
        ]);

        const orders = ordersData || [];
        const prodList = productsData.data || productsData || [];

        setStats({
          totalOrders: orders.length,
          awaitingPayment: orders.filter(o => o.status === 'pending').length,
          completed: orders.filter(o => o.status === 'completed').length,
          revenue: orders.reduce((acc, o) => acc + (o.total_amount || 0), 0)
        });

        setProducts(prodList.slice(0, 4));
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Welcome Header & Quick Stats */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div>
          <h2 className="text-4xl font-extrabold text-[#171c1f] tracking-tight mb-2">
            Hello, {user.profile?.full_name?.split(' ')[0] || 'Partner'}!
          </h2>
          <p className="text-slate-500 font-medium">Welcome back to your luxury command center.</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <StatCard label="All Orders" value={stats.totalOrders} />
          <StatCard label="Awaiting Payment" value={stats.awaitingPayment} isHighlight />
          <StatCard label="Completed" value={stats.completed} />
        </div>
      </section>

      {/* Asymmetric Bento Grid Section */}
      <div className="grid grid-cols-12 gap-8">
        {/* Activity & Revenue Visualization */}
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-white p-8 rounded-2xl shadow-[0_20px_40px_rgba(109,40,217,0.04)] beveled-edge border border-gray-50 h-full">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-bold tracking-tight text-slate-900">Activity & Revenue</h3>
                <p className="text-sm text-slate-500">Your shop's engagement frequency</p>
              </div>
              <div className="flex gap-2 bg-slate-50 p-1.5 rounded-xl">
                <button className="px-4 py-1.5 text-xs font-bold bg-white shadow-sm rounded-lg text-violet-700 font-mono">2026</button>
              </div>
            </div>
            
            {/* GitHub Style Heatmap */}
            <div className="overflow-x-auto pb-4 custom-scrollbar">
              <div className="inline-grid grid-rows-7 grid-flow-col gap-1.5 min-w-max">
                {Array.from({ length: 140 }).map((_, i) => {
                  const level = [0, 1, 2, 3, 4][Math.floor(Math.random() * 5)];
                  const colors = [
                    'bg-slate-50', 
                    'bg-violet-100', 
                    'bg-violet-300', 
                    'bg-violet-500', 
                    'bg-violet-700'
                  ];
                  return (
                    <div 
                      key={i} 
                      className={`w-3.5 h-3.5 rounded-[2px] ${colors[level]} transition-all hover:ring-2 hover:ring-violet-400 cursor-help`}
                      title={`Activity on day ${i}: ${level * 5} orders`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest ps-1">
                <span>JAN</span>
                <span>MAR</span>
                <span>MAY</span>
                <span>JUL</span>
                <span>SEP</span>
                <span>NOV</span>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Peak Day</p>
                  <p className="text-sm font-bold text-slate-900">Thursday</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Growth</p>
                  <p className="text-sm font-bold text-green-500">+12.5%</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                <span>Less</span>
                <div className="flex gap-1">
                  <div className="w-2.5 h-2.5 bg-slate-50 rounded-[1px]"></div>
                  <div className="w-2.5 h-2.5 bg-violet-100 rounded-[1px]"></div>
                  <div className="w-2.5 h-2.5 bg-violet-300 rounded-[1px]"></div>
                  <div className="w-2.5 h-2.5 bg-violet-500 rounded-[1px]"></div>
                  <div className="w-2.5 h-2.5 bg-violet-700 rounded-[1px]"></div>
                </div>
                <span>More</span>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Sidebar Content */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white border border-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 h-full">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-xl ring-2 ring-violet-100">
                  <img 
                    src={formatImage(user.profile?.avatar_url) || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&q=80'} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
              </div>
              
              <h4 className="text-xl font-black text-slate-900 leading-tight">{user.profile?.full_name || 'Merchant Partner'}</h4>
              <p className="text-sm font-bold text-violet-600 mt-1 uppercase tracking-tighter">Verified Curator</p>
              
              <div className="w-full grid grid-cols-2 gap-4 mt-10">
                <div className="p-5 bg-slate-50 rounded-2xl text-left border border-white">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-1">Invoices</p>
                  <p className="text-2xl font-black text-slate-900">{stats.totalOrders}</p>
                </div>
                <div className="p-5 bg-slate-50 rounded-2xl text-left border border-white">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-1">Rating</p>
                  <p className="text-2xl font-black text-slate-900">4.9<span className="text-xs text-slate-300 font-bold ml-1">/5</span></p>
                </div>
              </div>

              <button className="w-full mt-8 py-4 bg-slate-900 hover:bg-violet-700 text-white font-black rounded-2xl shadow-xl shadow-slate-200 transition-all text-xs uppercase tracking-widest">
                Edit Store Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Luxury Inventory Section */}
      <section className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h3 className="text-2xl font-black tracking-tight text-slate-900">Luxury Inventory</h3>
            <p className="text-slate-500 font-medium">Manage your high-performance assets</p>
          </div>
          <button className="flex items-center gap-2 text-violet-700 font-black text-xs uppercase group tracking-widest">
            View All Items
            <span className="material-symbols-outlined text-lg transition-transform group-hover:translate-x-1">arrow_forward</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
          {products.length > 0 ? products.map((product) => (
            <ProductCard key={product.id} product={product} />
          )) : (
            [...Array(4)].map((_, i) => <SkeletonCard key={i} />)
          )}
        </div>
      </section>
    </div>
  );
};

const StatCard = ({ label, value, isHighlight }) => (
  <div className={`bg-white beveled-edge px-8 py-6 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.03)] border border-white min-w-[200px] transition-transform hover:scale-105 ${isHighlight ? 'ring-2 ring-violet-100' : ''}`}>
    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-1">{label}</p>
    <p className={`text-3xl font-black ${isHighlight ? 'text-violet-600' : 'text-slate-900'}`}>{value}</p>
  </div>
);

const ProductCard = ({ product }) => (
  <div className="bg-white p-5 rounded-3xl border border-gray-50 shadow-xl shadow-slate-200/40 group hover:shadow-2xl hover:-translate-y-1 transition-all duration-500">
    <div className="aspect-square rounded-2xl bg-slate-50 mb-5 overflow-hidden relative">
      <img 
        src={formatImage(product.image)} 
        alt={product.name} 
        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
      />
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-sm">
        <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">
          {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
        </span>
      </div>
    </div>
    <h5 className="font-black text-slate-900 truncate pr-4 text-base tracking-tight">{product.name}</h5>
    <div className="flex justify-between items-center mt-3">
      <p className="text-sm font-bold text-violet-600">Rp{(product.price || 0).toLocaleString('id-ID')}</p>
      <span className="text-[10px] font-black py-1.5 px-3 bg-slate-100 text-slate-500 rounded-lg uppercase tracking-widest">{product.category}</span>
    </div>
  </div>
);

const SkeletonCard = () => (
  <div className="bg-white p-5 rounded-3xl border border-gray-50 shadow-sm animate-pulse">
    <div className="aspect-square rounded-2xl bg-slate-100 mb-5"></div>
    <div className="h-4 bg-slate-100 rounded w-3/4 mb-3"></div>
    <div className="flex justify-between">
      <div className="h-3 bg-slate-50 rounded w-1/4"></div>
      <div className="h-3 bg-slate-50 rounded w-1/4"></div>
    </div>
  </div>
);

export default MerchantDashboard;
