import React, { useState, useEffect } from 'react';
import { fetchJson, MERCHANT_API_BASE, formatImage, formatPaymentMethod } from '../../lib/api';
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
    netRevenue: 0,
    displayWho: [],
    displayWhat: [],
    displayWhere: [],
    displayCourier: [],
    displayPayment: [],
    whenStats: { morning: 0, afternoon: 0, evening: 0, night: 0 },
    affiliateRatio: 60,
    organicRatio: 40
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

        // --- Calculate 5W 1H Operational Analytics ---
        const whoStats = {};
        const whatStats = {};
        const whereStats = {};
        const whenStats = { morning: 0, afternoon: 0, evening: 0, night: 0 };
        let affiliateOrderCount = 0;
        let organicOrderCount = 0;
        const howCouriers = {};
        const howPayments = {};

        validOrders.forEach(o => {
          // WHO: Customer name
          if (o.order?.shipping_name) {
            whoStats[o.order.shipping_name] = (whoStats[o.order.shipping_name] || 0) + 1;
          }

          // WHAT: Product items
          if (o.items) {
            o.items.forEach(it => {
              whatStats[it.product_name] = (whatStats[it.product_name] || 0) + it.quantity;
            });
          }

          // WHERE: Shipping City
          if (o.order?.shipping_city) {
            const city = o.order.shipping_city.replace("KOTA ", "").replace("KABUPATEN ", "");
            whereStats[city] = (whereStats[city] || 0) + 1;
          }

          // WHEN: Hour of order
          if (o.created_at) {
            const hour = new Date(o.created_at).getHours();
            if (hour >= 6 && hour < 12) whenStats.morning += 1;
            else if (hour >= 12 && hour < 18) whenStats.afternoon += 1;
            else if (hour >= 18 && hour < 24) whenStats.evening += 1;
            else whenStats.night += 1;
          }

          // WHY: Affiliate vs Organic
          if (o.order?.affiliate_id) {
            affiliateOrderCount += 1;
          } else {
            organicOrderCount += 1;
          }

          // HOW: Couriers & Payments
          if (o.courier_code) {
            const courier = o.courier_code.toUpperCase();
            howCouriers[courier] = (howCouriers[courier] || 0) + 1;
          }
          if (o.order?.payment_method) {
            const pay = formatPaymentMethod(o.order.payment_method);
            howPayments[pay] = (howPayments[pay] || 0) + 1;
          }
        });

        const topWho = Object.entries(whoStats).sort((a,b) => b[1]-a[1]).slice(0, 3).map(x => ({ name: x[0], count: x[1] }));
        const topWhat = Object.entries(whatStats).sort((a,b) => b[1]-a[1]).slice(0, 3).map(x => ({ name: x[0], count: x[1] }));
        const topWhere = Object.entries(whereStats).sort((a,b) => b[1]-a[1]).slice(0, 3).map(x => ({ name: x[0], count: x[1] }));
        const topCourier = Object.entries(howCouriers).sort((a,b) => b[1]-a[1]).slice(0, 2).map(x => ({ name: x[0], count: x[1] }));
        const topPayment = Object.entries(howPayments).sort((a,b) => b[1]-a[1]).slice(0, 2).map(x => ({ name: x[0], count: x[1] }));

        const displayWho = topWho;
        const displayWhat = topWhat;
        const displayWhere = topWhere;
        const displayCourier = topCourier;
        const displayPayment = topPayment;

        const totalForWhy = (affiliateOrderCount + organicOrderCount) || 0;
        const affiliateRatio = totalForWhy > 0 ? Math.round((affiliateOrderCount / totalForWhy) * 100) : 0;
        const organicRatio = totalForWhy > 0 ? Math.round((organicOrderCount / totalForWhy) * 100) : 0;

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
          growthRate: validOrders.length > 0 ? 'Normal' : '0.0%',
          displayWho,
          displayWhat,
          displayWhere,
          displayCourier,
          displayPayment,
          whenStats,
          affiliateRatio,
          organicRatio
        });

        setProducts(prodList.slice(0, 4));
      } catch (_err) {
        console.error('Failed to load dashboard data:', _err);
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
          <div style={{ width: 44, height: 44, borderRadius: 12, overflow: 'hidden', border: '2px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', backgroundColor: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, color: '#6366f1' }}>
            {user.profile?.avatar_url ? (
              <img 
                src={formatImage(user.profile.avatar_url)} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                alt="Avatar"
              />
            ) : (
              user.profile?.full_name?.charAt(0)?.toUpperCase() || '?'
            )}
          </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{user.profile?.full_name}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1' }}>MITRA TERVERIFIKASI</div>
          </div>
      </PageHeader>

      <StatRow stats={[
        { label: 'Total Pesanan Masuk', val: loading ? '...' : stats.totalOrders, icon: 'bx-shopping-bag', color: '#6366f1' },
        { label: 'Pesanan Baru / Belum Bayar', val: loading ? '...' : stats.awaitingPayment, icon: 'bx-time-five', color: '#ef4444' },
        { label: 'Pesanan Selesai', val: loading ? '...' : stats.completed, icon: 'bx-check-double', color: '#10b981' },
      ]} />

      {/* 5W 1H Operational Analytics Grid */}
      <div style={{ marginBottom: 36 }}>
        <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', marginBottom: 6, letterSpacing: '-0.02em' }}>Analisis Operasional 5W 1H</h3>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>Pemetaan performa toko berdasarkan Siapa, Apa, Kapan, Di mana, Mengapa, dan Bagaimana.</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
          {/* WHO CARD */}
          <div style={{ ...A.card, padding: 28, border: '1px solid #f1f5f9', background: '#fff', borderRadius: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="bx bx-user" style={{ fontSize: 22 }} />
              </div>
              <div>
                <h4 style={{ fontSize: 11, fontWeight: 900, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>WHO (Siapa Pembeli?)</h4>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>Mitra & Pelanggan Teraktif</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8, justifyContent: 'center', minHeight: 120 }}>
              {stats.displayWho?.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#94a3b8', textAlign: 'center' }}>
                  <i className="bx bx-user-x" style={{ fontSize: 32 }} />
                  <span style={{ fontSize: 12, fontWeight: 700 }}>Belum ada data pelanggan</span>
                </div>
              ) : (
                (() => {
                  const totalWhoCount = stats.displayWho?.reduce((acc, c) => acc + c.count, 0) || 1;
                  return stats.displayWho?.map((w, idx) => {
                    const initials = w.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                    const pct = Math.round((w.count / totalWhoCount) * 100);
                    const isMitra = w.name.toLowerCase().includes('mitra');
                    const cleanName = w.name.replace(' (Mitra)', '');
                    const rankGradients = [
                      'linear-gradient(135deg, #fbbf24, #f59e0b)', // Gold
                      'linear-gradient(135deg, #cbd5e1, #94a3b8)', // Silver
                      'linear-gradient(135deg, #b45309, #78350f)'  // Bronze
                    ];
                    return (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ 
                              width: 32, height: 32, borderRadius: '50%', 
                              background: rankGradients[idx] || 'linear-gradient(135deg, #cbd5e1, #94a3b8)',
                              color: '#fff', fontSize: 11, fontWeight: 900,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}>
                              {initials}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>{cleanName}</span>
                                {isMitra && (
                                  <span style={{ fontSize: 9, fontWeight: 900, background: '#e0e7ff', color: '#4f46e5', padding: '1px 5px', borderRadius: 4, textTransform: 'uppercase' }}>Mitra</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <span style={{ fontSize: 11.5, fontWeight: 900, color: '#4f46e5' }}>{w.count} Order</span>
                        </div>
                        <div style={{ height: 6, width: '100%', background: '#f1f5f9', borderRadius: 10, overflow: 'hidden' }}>
                          <div style={{ 
                            height: '100%', 
                            width: `${pct}%`, 
                            background: 'linear-gradient(90deg, #6366f1, #a855f7)', 
                            borderRadius: 10,
                            boxShadow: '0 0 8px rgba(99,102,241,0.25)',
                            transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' 
                          }} />
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>
          </div>

          {/* WHAT CARD */}
          <div style={{ ...A.card, padding: 28, border: '1px solid #f1f5f9', background: '#fff', borderRadius: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="bx bx-package" style={{ fontSize: 22 }} />
              </div>
              <div>
                <h4 style={{ fontSize: 11, fontWeight: 900, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>WHAT (Apa Yang Terjual?)</h4>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>Produk Terlaris Saat Ini</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8, justifyContent: 'center', minHeight: 120 }}>
              {stats.displayWhat?.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#94a3b8', textAlign: 'center' }}>
                  <i className="bx bx-package" style={{ fontSize: 32 }} />
                  <span style={{ fontSize: 12, fontWeight: 700 }}>Belum ada produk terjual</span>
                </div>
              ) : (
                (() => {
                  const totalWhatCount = stats.displayWhat?.reduce((acc, c) => acc + c.count, 0) || 1;
                  return stats.displayWhat?.map((p, idx) => {
                    const pct = Math.round((p.count / totalWhatCount) * 100);
                    return (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                            <div style={{ 
                              width: 32, height: 32, borderRadius: 8, 
                              background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                              color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.05)', flexShrink: 0
                            }}>
                              <i className="bx bx-package" style={{ fontSize: 16 }} />
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                          </div>
                          <span style={{ fontSize: 11.5, fontWeight: 900, color: '#15803d', flexShrink: 0 }}>{p.count} Pcs</span>
                        </div>
                        <div style={{ height: 6, width: '100%', background: '#f1f5f9', borderRadius: 10, overflow: 'hidden' }}>
                          <div style={{ 
                            height: '100%', 
                            width: `${pct}%`, 
                            background: 'linear-gradient(90deg, #10b981, #34d399)', 
                            borderRadius: 10,
                            boxShadow: '0 0 8px rgba(16,185,129,0.25)',
                            transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' 
                          }} />
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>
          </div>

          {/* WHERE CARD */}
          <div style={{ ...A.card, padding: 28, border: '1px solid #f1f5f9', background: '#fff', borderRadius: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: '#ffedd5', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="bx bx-map-pin" style={{ fontSize: 22 }} />
              </div>
              <div>
                <h4 style={{ fontSize: 11, fontWeight: 900, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>WHERE (Ke Mana Dikirim?)</h4>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>Destinasi Wilayah Utama</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 4, minHeight: 120, justifyContent: 'center' }}>
              {stats.displayWhere?.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, width: '100%' }}>
                  <div style={{ position: 'relative', width: 88, height: 88, flexShrink: 0 }}>
                    <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3.2" />
                    </svg>
                    <div style={{ 
                      position: 'absolute', inset: 0, 
                      display: 'flex', flexDirection: 'column', 
                      alignItems: 'center', justifyContent: 'center' 
                    }}>
                      <span style={{ fontSize: 14, fontWeight: 900, color: '#94a3b8', lineHeight: 1 }}>0</span>
                      <span style={{ fontSize: 8, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginTop: 2 }}>Order</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, color: '#94a3b8', fontSize: 12.5, fontWeight: 700 }}>
                    Belum ada wilayah tujuan pengiriman
                  </div>
                </div>
              ) : (
                <>
                  {(() => {
                    const total = stats.displayWhere?.reduce((acc, c) => acc + c.count, 0) || 1;
                    const colors = ['#ea580c', '#f97316', '#fdba74'];
                    let cumulativePercent = 0;
                    return (
                      <div style={{ position: 'relative', width: 88, height: 88, flexShrink: 0 }}>
                        <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                          {stats.displayWhere?.map((l, idx) => {
                            const pct = Math.round((l.count / total) * 100);
                            const strokeDash = `${pct} ${100 - pct}`;
                            const strokeOffset = 100 - cumulativePercent;
                            cumulativePercent += pct;
                            return (
                              <circle 
                                key={idx}
                                cx="18" 
                                cy="18" 
                                r="15.915" 
                                fill="none" 
                                stroke={colors[idx] || '#cbd5e1'} 
                                strokeWidth="3.2" 
                                strokeDasharray={strokeDash}
                                strokeDashoffset={strokeOffset}
                                style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
                              />
                            );
                          })}
                        </svg>
                        <div style={{ 
                          position: 'absolute', inset: 0, 
                          display: 'flex', flexDirection: 'column', 
                          alignItems: 'center', justifyContent: 'center' 
                        }}>
                          <span style={{ fontSize: 14, fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{total}</span>
                          <span style={{ fontSize: 8, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginTop: 2 }}>Order</span>
                        </div>
                      </div>
                    );
                  })()}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                    {(() => {
                      const total = stats.displayWhere?.reduce((acc, c) => acc + c.count, 0) || 1;
                      const legendColors = ['#ea580c', '#f97316', '#fdba74'];
                      return stats.displayWhere?.map((l, idx) => {
                        const pct = Math.round((l.count / total) * 100);
                        return (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: legendColors[idx] || '#cbd5e1', flexShrink: 0 }} />
                              <span style={{ fontSize: 12, fontWeight: 800, color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.name}</span>
                            </div>
                            <span style={{ fontSize: 11.5, fontWeight: 900, color: legendColors[idx] }}>{pct}%</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* WHEN CARD */}
          <div style={{ ...A.card, padding: 28, border: '1px solid #f1f5f9', background: '#fff', borderRadius: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="bx bx-time animate-pulse" style={{ fontSize: 22 }} />
              </div>
              <div>
                <h4 style={{ fontSize: 11, fontWeight: 900, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>WHEN (Kapan Pesanan Ramai?)</h4>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>Distribusi Waktu Transaksi</div>
              </div>
            </div>
            
            {(() => {
              const maxVal = Math.max(1, stats.whenStats?.morning || 0, stats.whenStats?.afternoon || 0, stats.whenStats?.evening || 0, stats.whenStats?.night || 0);
              const data = [
                { label: 'Pagi', count: stats.whenStats?.morning || 0, hours: '06:00-12:00' },
                { label: 'Siang', count: stats.whenStats?.afternoon || 0, hours: '12:00-18:00' },
                { label: 'Malam', count: stats.whenStats?.evening || 0, hours: '18:00-24:00' },
                { label: 'Fajar', count: stats.whenStats?.night || 0, hours: '00:00-06:00' }
              ];
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 80, padding: '0 10px', borderBottom: '1px solid #f1f5f9' }}>
                    {data.map((item, idx) => {
                      const barHeight = Math.round((item.count / maxVal) * 60); // Max height of 60px
                      return (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: 4 }}>
                          <span style={{ fontSize: 10, fontWeight: 900, color: '#dc2626' }}>{item.count}</span>
                          <div style={{ 
                            width: 24, 
                            height: Math.max(4, barHeight), 
                            background: 'linear-gradient(to top, #f43f5e, #fb7185)', 
                            borderRadius: '6px 6px 0 0',
                            boxShadow: '0 2px 6px rgba(244,63,94,0.15)',
                            transition: 'height 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                          }} />
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, textAlign: 'center' }}>
                    {data.map((item, idx) => (
                      <div key={idx}>
                        <div style={{ fontSize: 11, color: '#1e293b', fontWeight: 800 }}>{item.label}</div>
                        <div style={{ fontSize: 8.5, color: '#94a3b8', marginTop: 1 }}>{item.hours}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* WHY CARD */}
          <div style={{ ...A.card, padding: 28, border: '1px solid #f1f5f9', background: '#fff', borderRadius: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: '#f3e8ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="bx bx-help-circle" style={{ fontSize: 22 }} />
              </div>
              <div>
                <h4 style={{ fontSize: 11, fontWeight: 900, color: '#9333ea', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>WHY (Mengapa Terjadi Order?)</h4>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>Faktor Pemicu Konversi</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 4 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 800, color: '#64748b' }}>
                  <span>REFERRAL AFILIASI</span>
                  <span>ORGANIK / POS</span>
                </div>
                <div style={{ display: 'flex', height: 10, borderRadius: 10, overflow: 'hidden', background: '#e2e8f0' }}>
                  <div style={{ 
                    width: `${stats.affiliateRatio}%`, 
                    background: 'linear-gradient(90deg, #a855f7, #c084fc)', 
                    boxShadow: '0 0 10px rgba(168,85,247,0.2)',
                    transition: 'width 1s ease-in-out' 
                  }} />
                  <div style={{ 
                    width: `${stats.organicRatio}%`, 
                    background: 'linear-gradient(90deg, #64748b, #94a3b8)', 
                    transition: 'width 1s ease-in-out' 
                  }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: '#faf5ff', padding: '10px 12px', borderRadius: 16, border: '1px solid #f3e8ff', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#7e22ce', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Afiliasi</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#6b21a8', marginTop: 2 }}>{stats.affiliateRatio}%</div>
                  <div style={{ fontSize: 9, color: '#a21caf', fontWeight: 700, marginTop: 2 }}>Referral Mitra</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 16, border: '1px solid #f1f5f9', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#475569', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Langsung / POS</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#1e293b', marginTop: 2 }}>{stats.organicRatio}%</div>
                  <div style={{ fontSize: 9, color: '#64748b', fontWeight: 700, marginTop: 2 }}>Toko & POS Kasir</div>
                </div>
              </div>
            </div>
          </div>

          {/* HOW CARD */}
          <div style={{ ...A.card, padding: 28, border: '1px solid #f1f5f9', background: '#fff', borderRadius: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="bx bx-cog" style={{ fontSize: 22 }} />
              </div>
              <div>
                <h4 style={{ fontSize: 11, fontWeight: 900, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>HOW (Bagaimana Dikirim & Dibayar?)</h4>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0284c7', marginTop: 2 }}>Metode Logistik & Pembayaran</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', gap: 16, marginTop: 4, minHeight: 120 }}>
              {stats.displayCourier?.length === 0 && stats.displayPayment?.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#94a3b8', textAlign: 'center' }}>
                  <i className="bx bx-cog" style={{ fontSize: 32 }} />
                  <span style={{ fontSize: 12, fontWeight: 700 }}>Belum ada data pengiriman & pembayaran</span>
                </div>
              ) : (
                <>
                  {/* Courier Progress Ring */}
                  {(() => {
                    const totalCourierCount = stats.displayCourier?.reduce((acc, c) => acc + c.count, 0) || 0;
                    const topPct = totalCourierCount > 0 ? Math.round(((stats.displayCourier?.[0]?.count || 0) / totalCourierCount) * 100) : 0;
                    const name = stats.displayCourier?.[0]?.name || 'Belum ada';
                    const r = 16;
                    const c = 2 * Math.PI * r; // ~100.53
                    const offset = c - (topPct / 100) * c;
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <div style={{ position: 'relative', width: 56, height: 56 }}>
                          <svg viewBox="0 0 40 40" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                            <circle cx="20" cy="20" r="16" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                            {totalCourierCount > 0 && (
                              <circle 
                                cx="20" cy="20" r="16" fill="none" 
                                stroke="#0284c7" strokeWidth="4.2" 
                                strokeDasharray={c} 
                                strokeDashoffset={offset}
                                strokeLinecap="round"
                                style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }} 
                              />
                            )}
                          </svg>
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
                            <i className="bx bx-bus" style={{ fontSize: 16 }} />
                          </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 11, fontWeight: 900, color: '#1e293b' }}>{name}</div>
                          <div style={{ fontSize: 9, fontWeight: 800, color: '#0284c7' }}>{topPct}% Kurir</div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Payment Progress Ring */}
                  {(() => {
                    const totalPaymentCount = stats.displayPayment?.reduce((acc, c) => acc + c.count, 0) || 0;
                    const topPct = totalPaymentCount > 0 ? Math.round(((stats.displayPayment?.[0]?.count || 0) / totalPaymentCount) * 100) : 0;
                    const name = stats.displayPayment?.[0]?.name || 'Belum ada';
                    const r = 16;
                    const c = 2 * Math.PI * r;
                    const offset = c - (topPct / 100) * c;
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <div style={{ position: 'relative', width: 56, height: 56 }}>
                          <svg viewBox="0 0 40 40" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                            <circle cx="20" cy="20" r="16" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                            {totalPaymentCount > 0 && (
                              <circle 
                                cx="20" cy="20" r="16" fill="none" 
                                stroke="#6366f1" strokeWidth="4.2" 
                                strokeDasharray={c} 
                                strokeDashoffset={offset}
                                strokeLinecap="round"
                                style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }} 
                              />
                            )}
                          </svg>
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                            <i className="bx bx-credit-card" style={{ fontSize: 16 }} />
                          </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 11, fontWeight: 900, color: '#1e293b' }}>{name}</div>
                          <div style={{ fontSize: 9, fontWeight: 800, color: '#6366f1' }}>{topPct}% Bayar</div>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </div>

        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 24, paddingBottom: 40, alignItems: 'start' }}>
        {/* Activity Heatmap Panel */}
        <div style={{ ...A.card, padding: 30, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin:0 }}>Peta Aktivitas Pesanan</h3>
              <p style={{ fontSize: 12, color: '#64748b', marginTop: 4, margin:0 }}>Pemetaan frekuensi pemrosesan pesanan selama kuartal ini</p>
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
