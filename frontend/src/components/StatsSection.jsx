import React, { useState, useEffect } from 'react';
import { API_BASE, fetchJson } from '../lib/api';

export default function StatsSection({ data }) {
  const defaultStats = [
    { key: 'stats_years_exp', value: '5+', label: 'Tahun Pengalaman' },
    { key: 'stats_products_sold', value: '20K+', label: 'Produk Terjual' },
    { key: 'stats_satisfied_users', value: '7M+', label: 'Pengguna Puas' },
    { key: 'stats_official_stores', value: '4+', label: 'Mitra Toko Resmi' },
  ];
  const [statsData, setStatsData] = useState(defaultStats);

  useEffect(() => {
    if (data && data.length > 0) {
      setStatsData(data);
      return;
    }
    
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
  }, [data]);

  return (
    <section className="py-16 px-4 md:px-10 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 text-center">
          {statsData.map((s, i) => (
            <div key={i} className="group flex flex-col gap-3 p-10 rounded-[2rem] bg-white border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-rose-600/10 hover:border-rose-100 transition-all duration-500 hover:-translate-y-2 relative overflow-hidden">
              {/* Subtle hover effect background */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full blur-3xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <span className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-rose-600 via-red-500 to-amber-500 group-hover:from-rose-500 group-hover:via-red-400 group-hover:to-amber-400 transition-all">
                {s.value}
              </span>
              <span className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-400 group-hover:text-gray-900 transition-colors duration-300">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
