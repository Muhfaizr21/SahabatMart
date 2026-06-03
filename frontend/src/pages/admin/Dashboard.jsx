import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';

const API = ADMIN_API_BASE;

const idr = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

// ─── COMPONENTS ───────────────────────────────────────

const StatCard = ({ icon, label, value, trend, trendUp, color, subText }) => (
  <div className="stat-card" style={{
    background: '#fff', borderRadius: '24px', padding: '24px',
    border: '1px solid #f1f5f9',
    boxShadow: '0 4px 20px -4px rgba(0,0,0,0.05)',
    display: 'flex', flexDirection: 'column', gap: '16px',
    position: 'relative', overflow: 'hidden'
  }}>
    <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.03 }}>
      <i className={`bx ${icon}`} style={{ fontSize: '100px', color }} />
    </div>
    
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
      <div style={{ 
        width: '48px', height: '48px', borderRadius: '14px', 
        background: color + '10', display: 'flex', alignItems: 'center', justifyContent: 'center' 
      }}>
        <i className={`bx ${icon}`} style={{ fontSize: '24px', color }} />
      </div>
      {trend && (
        <div style={{ 
          display: 'flex', alignItems: 'center', gap: '4px',
          padding: '4px 10px', borderRadius: '20px',
          background: trendUp ? '#f0fdf4' : '#fff1f2',
          color: trendUp ? '#16a34a' : '#dc2626',
          fontSize: '12px', fontWeight: '700'
        }}>
          <i className={`bx ${trendUp ? 'bx-trending-up' : 'bx-trending-down'}`} />
          {trend}
        </div>
      )}
    </div>

    <div style={{ position: 'relative', zIndex: 1 }}>
      <p style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
        {label}
      </p>
      <h3 style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
        {value}
      </h3>
      {subText && <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px', fontWeight: '500' }}>{subText}</p>}
    </div>
  </div>
);

const SectionHeader = ({ title, subtitle, action }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
    <div>
      <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>{title}</h2>
      {subtitle && <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0', fontWeight: '500' }}>{subtitle}</p>}
    </div>
    {action}
  </div>
);

const ActivityItem = ({ type, title, time, status, color = '#6366f1' }) => (
  <div style={{ 
    display: 'flex', gap: '16px', padding: '16px 0', 
    borderBottom: '1px solid #f8fafc',
    alignItems: 'center'
  }}>
    <div style={{ 
      width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
      background: color + '10', display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <i className={`bx ${type === 'order' ? 'bx-shopping-bag' : type === 'user' ? 'bx-user' : 'bx-bell'}`} style={{ color, fontSize: '18px' }} />
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{title}</div>
      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{time}</div>
    </div>
    {status && (
      <span style={{ 
        fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', 
        padding: '4px 10px', borderRadius: '20px',
        background: '#f1f5f9', color: '#475569'
      }}>
        {status}
      </span>
    )}
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear().toString());

  const [exporting, setExporting] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetchJson(API + '/overview'),
      fetchJson(`${API}/finance/monthly?year=${year}`),
    ]).then(([ov, mo]) => {
      setOverview(ov);
      setMonthly(Array.isArray(mo) ? mo : (mo?.data || []));
    }).catch(console.error).finally(() => setLoading(false));
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/export-report`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'ngrok-skip-browser-warning': 'true'
        }
      });
      if (!response.ok) {
        throw new Error('Gagal mengekspor laporan');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `akuglow_report_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || 'Gagal mengekspor laporan');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => { loadData(); }, [year]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', flexDirection: 'column', gap: '20px' }}>
      <div className="premium-spinner" style={{
        width: '50px', height: '50px', borderRadius: '50%',
        border: '4px solid #f1f5f9', borderTopColor: '#6366f1',
        animation: 'spin 1s cubic-bezier(0.68, -0.55, 0.27, 1.55) infinite'
      }} />
      <p style={{ fontSize: '14px', color: '#64748b', fontWeight: '600', letterSpacing: '0.05em' }}>PREPARING INSIGHTS...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div className="admin-dashboard-root" style={{ padding: '4px 0 40px' }}>
      {/* ─── TOP BAR ─── */}
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        marginBottom: '40px', flexWrap: 'wrap', gap: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ 
              fontSize: '10px', fontWeight: '900', color: '#fff', background: '#6366f1', 
              padding: '4px 12px', borderRadius: '20px', letterSpacing: '0.1em' 
            }}>SUPER ADMIN</span>
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>Dashboard Overview</span>
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', margin: 0, letterSpacing: '-0.04em' }}>
            AkuGlow Command <span style={{ color: '#6366f1' }}>Center</span>
          </h1>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={loadData} className="btn-secondary" style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px',
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px',
            fontSize: '14px', fontWeight: '700', color: '#475569', cursor: 'pointer',
            transition: 'all 0.2s'
          }}>
            <i className="bx bx-refresh" style={{ fontSize: '20px' }} />
            Sync Data
          </button>
          <button onClick={handleExport} disabled={exporting} className="btn-primary" style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px',
            background: exporting ? '#94a3b8' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', 
            border: 'none', borderRadius: '14px',
            fontSize: '14px', fontWeight: '700', color: '#fff', cursor: exporting ? 'not-allowed' : 'pointer',
            boxShadow: exporting ? 'none' : '0 10px 25px -5px rgba(79, 70, 229, 0.4)',
            transition: 'all 0.2s'
          }}>
            <i className={`bx ${exporting ? 'bx-loader-alt bx-spin' : 'bx-cloud-download'}`} style={{ fontSize: '20px' }} />
            {exporting ? 'Exporting...' : 'Export Report'}
          </button>
        </div>
      </div>

      {/* ─── KPI GRID ─── */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', 
        gap: '24px',
        marginBottom: '40px'
      }}>
        <StatCard 
          icon="bx-dollar-circle" color="#6366f1" label="Platform Revenue" 
          value={idr(overview?.total_revenue)} trend="24.5%" trendUp={true}
          subText="Gross Merchandise Value"
        />
        <StatCard 
          icon="bx-user-voice" color="#06b6d4" label="Active Affiliates" 
          value={(overview?.total_affiliates || 0).toLocaleString()} trend="12%" trendUp={true}
          subText="Growth from referral network"
        />
        <StatCard 
          icon="bx-store-alt" color="#8b5cf6" label="Total Merchants" 
          value={(overview?.total_merchants || 0).toLocaleString()} trend="5.2%" trendUp={true}
          subText="Verified ecosystem partners"
        />
        <StatCard 
          icon="bx-package" color="#f59e0b" label="Pending Payouts" 
          value={(overview?.pending_payouts || 0).toLocaleString()} 
          trend={overview?.pending_payouts > 10 ? "Warning" : null} trendUp={false}
          subText="Awaiting admin approval"
        />
      </div>

      {/* ─── MAIN CONTENT AREA ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px', alignItems: 'start' }}>
        
        {/* Left Column: Analytics & Charts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Revenue Chart Section */}
          <div style={{ 
            background: '#fff', borderRadius: '24px', padding: '32px',
            border: '1px solid #f1f5f9', boxShadow: '0 4px 20px -4px rgba(0,0,0,0.03)'
          }}>
            <SectionHeader 
              title="Revenue Performance" 
              subtitle="Monthly revenue breakdown and trends"
              action={
                <select 
                  value={year} onChange={(e) => setYear(e.target.value)}
                  style={{ 
                    padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0',
                    fontSize: '13px', fontWeight: '700', color: '#475569', outline: 'none'
                  }}
                >
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                </select>
              }
            />
            
            <div style={{ height: '300px', width: '100%', marginTop: '20px', position: 'relative' }}>
              {monthly.length > 0 ? (
                <div style={{ display: 'flex', alignItems: 'flex-end', height: '240px', gap: '12px' }}>
                  {monthly.map((m, idx) => {
                    const max = Math.max(...monthly.map(x => x.revenue), 1);
                    const height = (m.revenue / max) * 100;
                    return (
                      <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', height: '100%', justifyContent: 'flex-end' }}>
                        <div style={{ 
                          width: '100%', height: `${height}%`, minHeight: '4px',
                          background: m.month.includes('-05') ? 'linear-gradient(180deg, #6366f1 0%, #4f46e5 100%)' : '#e2e8f0',
                          borderRadius: '8px 8px 4px 4px',
                          transition: 'all 0.5s ease',
                          position: 'relative'
                        }} title={idr(m.revenue)}>
                          {height > 15 && <div style={{ 
                            position: 'absolute', top: '-25px', left: '50%', transform: 'translateX(-50%)',
                            fontSize: '10px', fontWeight: '800', color: '#6366f1'
                          }}>{(m.revenue / 1000000).toFixed(1)}M</div>}
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8' }}>
                          {m.month.split('-')[1]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '14px' }}>
                  No transaction data found for this period.
                </div>
              )}
            </div>
          </div>

          {/* System Performance & Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', 
              borderRadius: '24px', padding: '24px', color: '#fff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 10px #22c55e' }} />
                <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.1em' }}>HEALTHY</span>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '900', margin: '0 0 8px' }}>API & Database</h3>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: '1.6' }}>
                All core services are responding normally. Latency: <span style={{ color: '#22c55e' }}>24ms</span>
              </p>
            </div>
            
            <div style={{ 
              background: '#fff', borderRadius: '24px', padding: '24px',
              border: '1px solid #f1f5f9', boxShadow: '0 4px 20px -4px rgba(0,0,0,0.03)'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '900', margin: '0 0 12px', color: '#0f172a' }}>Moderation Queue</h3>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: '#f59e0b' }}>12</div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Products</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: '#ef4444' }}>5</div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Merchants</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          

          {/* Quick Shortcuts */}
          <div style={{ 
            background: '#fff', borderRadius: '24px', padding: '32px',
            border: '1px solid #f1f5f9', boxShadow: '0 4px 20px -4px rgba(0,0,0,0.03)'
          }}>
            <SectionHeader title="Quick Shortcuts" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { label: 'Orders', icon: 'bx-shopping-bag', path: '/admin/orders', color: '#6366f1' },
                { label: 'Merchants', icon: 'bx-store', path: '/admin/merchants', color: '#8b5cf6' },
                { label: 'Users', icon: 'bx-user', path: '/admin/users', color: '#06b6d4' },
                { label: 'Finance', icon: 'bx-wallet', path: '/admin/finance', color: '#10b981' },
                { label: 'Settings', icon: 'bx-cog', path: '/admin/settings', color: '#64748b' },
                { label: 'Security', icon: 'bx-shield-quarter', path: '/admin/security', color: '#ef4444' },
              ].map(item => (
                <Link key={item.label} to={item.path} style={{ 
                  textDecoration: 'none', display: 'flex', flexDirection: 'column', 
                  alignItems: 'center', padding: '16px', borderRadius: '16px', 
                  background: '#f8fafc', gap: '8px', border: '1px solid #f1f5f9',
                  transition: 'transform 0.2s, background 0.2s'
                }} 
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#fff';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.05)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                >
                  <i className={`bx ${item.icon}`} style={{ fontSize: '24px', color: item.color }} />
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
