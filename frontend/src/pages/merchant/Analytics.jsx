import React, { useState, useEffect } from 'react';
import { fetchJson, MERCHANT_API_BASE } from '../../lib/api';
import { PageHeader, StatRow, A, idr } from '../../lib/adminStyles.jsx';

export default function MerchantAnalytics() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchJson(`${MERCHANT_API_BASE}/affiliate-stats?year=${year}`)
      .then(res => {
        const data = res?.data || res || {};
        const rawChart = data.chart_data || [];
        
        const maxMonthly = Math.max(1, ...rawChart.map(d => d.count));
        const chartData = rawChart.map(val => ({
           count: val.count,
           sales: val.sales,
           heightPct: Math.max(5, (val.count / maxMonthly) * 100)
        }));

        setStats({ ...data, chartData });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year]);

  return (
    <div style={A.page} className="fade-in">
      <PageHeader 
        title="Analisis Performa" 
        subtitle="Wawasan mendalam tentang pertumbuhan toko dan konversi afiliasi Anda."
      />

      <StatRow stats={[
        { label: 'Total Omzet (Gross)', val: loading ? '...' : idr(stats?.total_sales || 0), icon: 'bx-stats', color: '#1e293b' },
        { label: 'Pendapatan Bersih', val: loading ? '...' : idr(stats?.total_net_sales || 0), icon: 'bx-wallet', color: '#10b981' },
        { label: 'Total Pesanan', val: loading ? '...' : `${stats?.total_orders || 0} Trx`, icon: 'bx-shopping-bag', color: '#334155' },
        { label: 'Konversi Afiliasi', val: loading ? '...' : `${stats?.affiliate_orders || 0} Pesanan`, icon: 'bx-network-chart', color: '#6366f1' },
        { label: 'Komisi Jaringan', val: loading ? '...' : idr(stats?.affiliate_commissions || 0), icon: 'bx-transfer', color: '#f59e0b' },
      ]} />

      <div style={{ ...A.card, padding: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>Trajektori Penjualan ({year})</h3>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 4, margin: 0 }}>Volume interaksi konversi bulanan.</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <select 
              value={year} 
              onChange={(e) => setYear(parseInt(e.target.value))}
              style={{ ...A.input, width: 140, height: 40, padding: '0 12px', cursor: 'pointer' }}
            >
              {Array.from({ length: (new Date().getFullYear() - 2023) + 2 }, (_, i) => 2023 + i).reverse().map(y => (
                <option key={y} value={y}>Tahun {y}</option>
              ))}
            </select>
            <button style={A.btnGhost}>Ekspor PDF</button>
          </div>
        </div>
        
        <div style={{ height: 260, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
          {(stats?.chartData || new Array(12).fill({ count: 0, heightPct: 5 })).map((data, i) => {
             const currentMonth = new Date().getMonth();
             const isCurrent = i === currentMonth;
             return (
               <div key={i} title={`Month: ${i+1} | Conversions: ${data.count}`} style={{ flex: 1, background: '#f8fafc', height: `${data.heightPct}%`, borderRadius: '12px 12px 0 0', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.3s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                 <div style={{ position: 'absolute', bottom: 0, width: '100%', height: isCurrent ? '100%' : '60%', background: isCurrent ? '#4f46e5' : '#c7d2fe', transition: 'all 0.3s' }} />
               </div>
             );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>
          <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>Mei</span><span>Jun</span><span>Jul</span><span>Agu</span><span>Sep</span><span>Okt</span><span>Nov</span><span>Des</span>
        </div>
      </div>
    </div>
  );
}
