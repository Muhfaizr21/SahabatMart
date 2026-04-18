import React, { useState, useEffect } from 'react';
import { fetchJson, MERCHANT_API_BASE } from '../../lib/api';
import { PageHeader, StatRow, A, idr } from '../../lib/adminStyles.jsx';

export default function MerchantAnalytics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchJson(`${MERCHANT_API_BASE}/affiliate-stats`),
      fetchJson(`${MERCHANT_API_BASE}/orders`)
    ])
      .then(([statsRes, ordersRes]) => {
        const data = statsRes?.data || statsRes || {};
        const orders = Array.isArray(ordersRes?.data) ? ordersRes.data : (Array.isArray(ordersRes) ? ordersRes : []);
        
        // Calculate true monthly volume (Jan - Dec)
        const currentYear = new Date().getFullYear();
        const monthly = new Array(12).fill(0);
        orders.forEach(o => {
          if (!o.created_at) return;
          const d = new Date(o.created_at);
          if (d.getFullYear() === currentYear) {
             monthly[d.getMonth()] += 1; // You can also switch this to += o.total_amount if you prefer GMV
          }
        });

        const maxMonthly = Math.max(1, ...monthly);
        const chartData = monthly.map(val => ({
           count: val,
           heightPct: Math.max(5, (val / maxMonthly) * 100) // minimum 5% height to be visible
        }));

        setStats({ ...data, chartData });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={A.page} className="fade-in">
      <PageHeader 
        title="Performance Analytics" 
        subtitle="Deep insights into your shop's growth and affiliate conversions."
      />

      <StatRow stats={[
        { label: 'Affiliate Attribution', val: loading ? '...' : `${stats?.affiliate_orders || 0} Orders`, icon: 'bx-network-chart', color: '#6366f1' },
        { label: 'Partner Revenue', val: loading ? '...' : idr(stats?.affiliate_sales || 0), icon: 'bx-diamond', color: '#10b981' },
        { label: 'Network Commission', val: loading ? '...' : idr(stats?.affiliate_commissions || 0), icon: 'bx-transfer', color: '#f59e0b' },
      ]} />

      <div style={{ ...A.card, padding: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>Sales Trajectory ({new Date().getFullYear()})</h3>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 4, margin: 0 }}>Monthly conversion interaction volume.</p>
          </div>
          <button style={A.btnGhost}>Export PDF</button>
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
          <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
        </div>
      </div>
    </div>
  );
}
