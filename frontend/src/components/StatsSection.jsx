import React, { useState, useEffect } from 'react';
import { API_BASE, fetchJson } from '../lib/api';

export default function StatsSection() {
  const [statsData, setStatsData] = useState([
    { key: 'stats_years_exp', value: '5+', label: 'Tahun Pengalaman' },
    { key: 'stats_products_sold', value: '20K+', label: 'Produk Terjual' },
    { key: 'stats_satisfied_users', value: '7M+', label: 'Pengguna Puas' },
    { key: 'stats_official_stores', value: '4+', label: 'Mitra Toko Resmi' },
  ]);

  useEffect(() => {
    fetchJson(`${API_BASE}/api/public/config`)
      .then(res => {
        // fetchJson in lib/api.js already unwraps { status: 'success', data: ... }
        const config = res || {};
        setStatsData(prev => prev.map(item => ({
          ...item,
          value: config[item.key] || item.value
        })));
      })
      .catch(err => console.error('Error fetching stats:', err));
  }, []);

  return (
    <section className="py-16 px-4 md:px-10 bg-white">
      <div className="max-w-7xl mx-auto bg-gray-900 rounded-[3rem] py-20 px-8 relative overflow-hidden text-white shadow-2xl shadow-gray-900/20">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-rose-600 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500 rounded-full blur-[120px]"></div>
        </div>
        
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 text-center">
          {statsData.map((s, i) => (
            <div key={i} className="group flex flex-col gap-3 p-8 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 hover:border-amber-500/50 transition-all duration-500 hover:-translate-y-2">
              <span className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-rose-500 via-red-500 to-amber-500 group-hover:from-rose-400 group-hover:via-red-400 group-hover:to-amber-400 transition-all">
                {s.value}
              </span>
              <span className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-400 group-hover:text-white transition-colors">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
