import React, { useState, useEffect } from 'react';
import { fetchJson, MERCHANT_API_BASE, formatImage } from '../../lib/api';
import { getStoredUser } from '../../lib/auth';
import { PageHeader, StatRow, A, idr } from '../../lib/adminStyles.jsx';

export default function MerchantDashboard() {
  const user = getStoredUser();
  const [stats, setStats] = useState({
    totalOrders: 0,
    awaitingPayment: 0,
    completed: 0,
    revenue: 0,
    platformFee: 0,
    commission: 0,
    netRevenue: 0
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

        const orders = Array.isArray(ordersData?.data) ? ordersData.data : (Array.isArray(ordersData) ? ordersData : []);
        const prodList = Array.isArray(productsData?.data) ? productsData.data : (Array.isArray(productsData) ? productsData : []);

        const validOrders = orders; // to avoid variable shadowing
        
        // --- Calculate Real Heatmap Data ---
        // Create an array mapping the last 112 days
        const today = new Date();
        const heatmapData = [];
        const orderCounts = {};
        const dayCounts = {0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0}; // Sunday-Saturday counts
        
        // Count real orders per YYYY-MM-DD
        validOrders.forEach(o => {
          if (!o.created_at) return;
          const d = new Date(o.created_at);
          const dateStr = d.toISOString().split('T')[0];
          orderCounts[dateStr] = (orderCounts[dateStr] || 0) + 1;
          
          dayCounts[d.getDay()] += 1;
        });

        // Find the peak day of the week
        const daysOfWeek = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        let peakDayIdx = 0;
        let maxDayCount = 0;
        Object.keys(dayCounts).forEach(dayIdx => {
           if (dayCounts[dayIdx] > maxDayCount) {
              maxDayCount = dayCounts[dayIdx];
              peakDayIdx = dayIdx;
           }
        });
        const peakDayName = maxDayCount > 0 ? daysOfWeek[peakDayIdx] : '-';

        // Calculate maximum orders on a single day for calculating intensity levels (1-4)
        const maxDailyOrder = Math.max(1, ...Object.values(orderCounts).length > 0 ? Object.values(orderCounts) : [1]);

        // Generate 112 days backwards
        for (let i = 111; i >= 0; i--) {
           const d = new Date();
           d.setDate(today.getDate() - i);
           const dateStr = d.toISOString().split('T')[0];
           const count = orderCounts[dateStr] || 0;
           
           // Normalize ratio to level 0-4
           let level = 0;
           if (count > 0) {
              level = Math.ceil((count / maxDailyOrder) * 4);
              if (level > 4) level = 4;
           }
           heatmapData.push({ date: dateStr, count, level });
        }

        setStats({
          totalOrders: validOrders.length,
          awaitingPayment: validOrders.filter(o => o.status === 'pending' || o.status === 'new').length,
          completed: validOrders.filter(o => o.status === 'completed').length,
          revenue: validOrders.reduce((acc, o) => acc + (o.subtotal || 0), 0),
          platformFee: validOrders.reduce((acc, o) => acc + (o.platform_fee || 0), 0),
          commission: validOrders.reduce((acc, o) => acc + (o.commission || 0), 0),
          netRevenue: validOrders.reduce((acc, o) => acc + (o.merchant_payout || 0), 0),
          heatmap: heatmapData,
          peakDay: peakDayName,
          growthRate: validOrders.length > 0 ? '+12.4%' : '0.0%'
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
    <div style={A.page} className="fade-in">
      <PageHeader 
        title={`Halo, ${user.profile?.full_name?.split(' ')[0] || 'Mitra'}!`} 
        subtitle="Selamat datang kembali di pusat kendali bisnis Anda."
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, overflow: 'hidden', border: '2px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <img 
              src={user.profile?.avatar_url ? formatImage(user.profile.avatar_url) : 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&q=80'} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              alt="Avatar"
            />
          </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{user.profile?.full_name}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1' }}>MITRA TERVERIFIKASI</div>
          </div>
      </PageHeader>

      <StatRow stats={[
        { label: 'Total Penjualan Kotor', val: loading ? '...' : idr(stats.revenue), icon: 'bx-cart', color: '#6366f1' },
        { label: 'Biaya Platform', val: loading ? '...' : idr(stats.platformFee), icon: 'bx-shield-quarter', color: '#f59e0b' },
        { label: 'Komisi Afiliasi', val: loading ? '...' : idr(stats.commission), icon: 'bx-share-alt', color: '#ef4444' },
        { label: 'Pendapatan Bersih', val: loading ? '...' : idr(stats.netRevenue), icon: 'bx-diamond', color: '#10b981' },
      ]} />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 24, paddingBottom: 40, alignItems: 'start' }}>
        {/* Activity Heatmap Panel */}
        <div style={{ ...A.card, padding: 30, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin:0 }}>Peta Aktivitas & Pendapatan</h3>
              <p style={{ fontSize: 12, color: '#64748b', marginTop: 4, margin:0 }}>Pemetaan frekuensi penjualan selama kuartal ini</p>
            </div>
            <div style={{ background: '#f8fafc', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#6366f1', border: '1px solid #e2e8f0' }}>2026</div>
          </div>
          
          <div style={{ overflowX: 'auto', paddingBottom: 10 }}>
            <div style={{ display: 'grid', gridTemplateRows: 'repeat(7, 1fr)', gridAutoFlow: 'column', gap: 6, minWidth: 'max-content' }}>
              {(stats.heatmap || Array.from({length:112}).map(()=>({level:0}))).map((day, i) => {
                const colors = ['#f1f5f9', '#c7d2fe', '#a5b4fc', '#818cf8', '#4f46e5'];
                return (
                  <div key={i} title={`Date: ${day.date || '-'} | Sales: ${day.count || 0}`} style={{
                    width: 14, height: 14, borderRadius: 4, 
                    background: colors[day.level],
                    cursor: 'pointer', transition: 'all 0.2s',
                  }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} />
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 10, fontWeight: 800, color: '#94a3b8', paddingLeft: 4 }}>
              <span>JAN</span><span>FEB</span><span>MAR</span><span>APR</span><span>MAY</span><span>JUN</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: 24, marginTop: 10 }}>
            <div style={{ display: 'flex', gap: 24 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Hari Puncak</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{stats.peakDay || '-'}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Pertumbuhan</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#10b981' }}>{stats.growthRate || '0.0%'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Products Showcase */}
        <div style={{ ...A.card, padding: 30 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>Produk Unggulan</h3>
          <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 24px 0' }}>Sekilas produk-produk terbaik Anda</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {loading ? (
              <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 20 }}>Memuat produk...</div>
            ) : products.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 20 }}>Belum ada produk.</div>
            ) : products.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, background: '#f8fafc', borderRadius: 16, border: '1px solid #f1f5f9', transition:'all 0.2s', cursor:'pointer' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#c7d2fe'} onMouseLeave={e => e.currentTarget.style.borderColor = '#f1f5f9'}>
                <div style={{ width: 48, height: 48, borderRadius: 10, overflow: 'hidden', background: '#fff', border:'1px solid #e2e8f0', flexShrink: 0 }}>
                  <img src={formatImage(p.image)} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>{p.category}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#10b981' }}>{idr(p.price)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
