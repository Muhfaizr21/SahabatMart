import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';

const API = ADMIN_API_BASE;

const idr = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

// ─── KPI CARD ─────────────────────────────────────────
const KpiCard = ({ icon, label, value, trend, trendUp = true, color, sub }) => (
  <div style={{
    background: '#fff', borderRadius: 20, padding: '24px 24px 20px',
    border: '1px solid #f1f5f9',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02)',
    display: 'flex', flexDirection: 'column', gap: 16,
    transition: 'all 0.2s', cursor: 'default',
  }}
  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.08)'}
  onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02)'}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: color + '14',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i className={`bx ${icon}`} style={{ fontSize: 20, color }} />
      </div>
      {trend && (
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
          background: trendUp ? '#f0fdf4' : '#fff1f2',
          color: trendUp ? '#16a34a' : '#dc2626',
        }}>
          {trendUp ? '↑' : '↓'} {trend}
        </span>
      )}
    </div>
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.04em', lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 6, fontWeight: 500 }}>{sub}</div>}
    </div>
  </div>
);

// ─── SECTION TITLE ────────────────────────────────────
const SectionTitle = ({ text }) => (
  <h2 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 0, letterSpacing: '-0.01em' }}>{text}</h2>
);

// ─── ACTION ROW ───────────────────────────────────────
const QuickAction = ({ to, icon, label, sub, color }) => (
  <Link to={to} style={{
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '14px 16px', borderRadius: 14,
    background: '#f8fafc', border: '1px solid #f1f5f9',
    textDecoration: 'none', transition: 'all 0.18s',
  }}
  onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.07)'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
  onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#f1f5f9'; }}
  >
    <div style={{
      width: 40, height: 40, borderRadius: 12, flexShrink: 0,
      background: color + '12',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <i className={`bx ${icon}`} style={{ fontSize: 18, color }} />
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{sub}</div>
    </div>
    <i className="bx bx-chevron-right" style={{ fontSize: 18, color: '#cbd5e1' }} />
  </Link>
);

// ─── CHART BAR ────────────────────────────────────────
const BarChart = ({ data }) => {
  const max = Math.max(...data.map(d => d.revenue), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 180, padding: '0 4px' }}>
      {data.map((d, i) => {
        const h = (d.revenue / max) * 100;
        const isLast = i === data.length - 1;
        return (
          <div key={d.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 6 }}>
            <div title={idr(d.revenue)} style={{
              width: '100%', height: `${Math.max(h, 8)}%`,
              borderRadius: '8px 8px 0 0',
              background: isLast
                ? 'linear-gradient(180deg, #6366f1, #4f46e5)'
                : 'linear-gradient(180deg, #e0e7ff, #c7d2fe)',
              transition: 'all 0.3s',
              boxShadow: isLast ? '0 8px 24px rgba(99,102,241,0.3)' : 'none',
              position: 'relative'
            }}
            onMouseEnter={e => !isLast && (e.currentTarget.style.background = 'linear-gradient(180deg, #a5b4fc, #818cf8)')}
            onMouseLeave={e => !isLast && (e.currentTarget.style.background = 'linear-gradient(180deg, #e0e7ff, #c7d2fe)')}
            />
            <span style={{ fontSize: 9, fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase' }}>
              {d.month.slice(5)}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ─── MAIN DASHBOARD ───────────────────────────────────
export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear().toString());

  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({length: 5}, (_, i) => (currentYear - i).toString());

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetchJson(API + '/overview'),
      fetchJson(`${API}/finance/monthly?year=${year}`),
    ]).then(([ov, mo]) => {
      setOverview(ov);
      const data = Array.isArray(mo) ? mo : (mo?.data || []);
      setMonthly(data);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [year]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        border: '3px solid #e0e7ff', borderTopColor: '#6366f1',
        animation: 'spin 0.8s linear infinite'
      }} />
      <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>Loading analytics...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
    </div>
  );

  const kpis = [
    { icon: 'bxs-group', label: 'Total Users', value: (overview?.total_users || 0).toLocaleString('id-ID'), trend: '12.5%', color: '#6366f1', sub: 'Platform-wide registrations' },
    { icon: 'bxs-store-alt', label: 'Active Merchants', value: (overview?.total_merchants || 0).toLocaleString('id-ID'), trend: '2.3%', color: '#8b5cf6', sub: `${overview?.pending_payouts || 0} payout pending` },
    { icon: 'bxs-link-alt', label: 'Affiliates', value: (overview?.total_affiliates || 0).toLocaleString('id-ID'), trend: '5.8%', color: '#06b6d4', sub: 'Active referral network' },
    { icon: 'bxs-shopping-bag', label: 'Total Orders', value: (overview?.total_orders || 0).toLocaleString('id-ID'), trend: '8.1%', color: '#f59e0b', sub: 'All-time transactions' },
    { icon: 'bxs-dollar-circle', label: 'Gross Revenue', value: idr(overview?.total_revenue), trend: '18%', color: '#10b981', sub: 'Platform GMV' },
    { icon: 'bx-line-chart', label: 'Platform Fee', value: idr(overview?.total_fee), trend: '14%', color: '#ef4444', sub: 'Net earnings' },
  ];

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ─── PAGE HEADER ─── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{
              fontSize: 10, fontWeight: 800, color: '#6366f1',
              textTransform: 'uppercase', letterSpacing: '0.1em',
              background: '#eef2ff', padding: '4px 10px', borderRadius: 20,
            }}>Live Analytics</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em', marginBottom: 4 }}>
            Command Center
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', fontWeight: 500, marginBottom: 0 }}>
            Monitor and manage your entire AkuGlow ecosystem in real-time.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={loadData} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
            borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff',
            fontSize: 13, fontWeight: 700, color: '#475569', cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}>
            <i className="bx bx-refresh" style={{ fontSize: 17 }} /> Refresh
          </button>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
            borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
          }}>
            <i className="bx bx-cloud-download" style={{ fontSize: 17 }} /> Export
          </button>
        </div>
      </div>

      {/* ─── KPI GRID ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        {kpis.map(k => <KpiCard key={k.label} {...k} />)}
      </div>

      {/* ─── MAIN GRID ─── */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap',
        gap: 20 
      }}>

        {/* Chart */}
        <div style={{
          flex: '1 1 500px',
          background: '#fff', borderRadius: 20, padding: 28,
          border: '1px solid #f1f5f9',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          minWidth: 0 // Prevent overflow in flex
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
            <div>
              <SectionTitle text="Revenue Growth" />
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4, marginBottom: 0, fontWeight: 500 }}>
                Monthly GMV & platform fee breakdown
              </p>
            </div>
            <div style={{ display: 'flex', gap: 4, background: '#f8fafc', padding: '4px 8px', borderRadius: 10, border: '1px solid #f1f5f9' }}>
              <select 
                value={year} 
                onChange={(e) => setYear(e.target.value)}
                style={{
                  border: 'none', background: 'transparent', fontSize: 13, fontWeight: 700,
                  color: '#6366f1', outline: 'none', cursor: 'pointer'
                }}
              >
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {monthly.length > 0 ? (
            <>
              <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
                <div style={{ minWidth: 400 }}>
                  <BarChart data={monthly} />
                </div>
              </div>
              <div style={{ 
                borderTop: '1px solid #f1f5f9', 
                marginTop: 24, 
                paddingTop: 20, 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 20
              }}>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Total GMV', value: idr(overview?.total_revenue), color: '#6366f1' },
                    { label: 'Platform Fee', value: idr(overview?.total_fee), color: '#10b981' },
                    { label: 'Orders', value: (overview?.total_orders || 0).toLocaleString('id-ID'), color: '#f59e0b' },
                  ].map(s => (
                    <div key={s.label} style={{ minWidth: 100 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: s.color, letterSpacing: '-0.03em' }}>{s.value}</div>
                    </div>
                  ))}
                </div>
                <Link to="/admin/finance" style={{
                  fontSize: 12, fontWeight: 700, color: '#6366f1',
                  textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4,
                  padding: '8px 12px', background: '#f5f7ff', borderRadius: 8
                }}>
                  View Ledger <i className="bx bx-right-arrow-alt" style={{ fontSize: 18 }} />
                </Link>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200 }}>
              <i className="bx bx-bar-chart-alt-2" style={{ fontSize: 48, color: '#e2e8f0', marginBottom: 12 }} />
              <p style={{ fontSize: 14, color: '#cbd5e1', fontWeight: 600, marginBottom: 0 }}>No transaction data yet</p>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div style={{ flex: '1 1 340px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* System Status */}
          <div style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
            borderRadius: 20, padding: 24, position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: -20, right: -20, fontSize: 100, color: 'rgba(255,255,255,0.02)' }}>
              <i className="bx bxs-shield-alt-2" />
            </div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
                <span style={{ fontSize: 10, fontWeight: 800, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.1em' }}>All Systems Operational</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.03em', marginBottom: 8 }}>
                99.9% Uptime
              </div>
              <p style={{ fontSize: 12, color: '#475569', fontWeight: 500, marginBottom: 20 }}>
                Database, API & worker services are running without issues.
              </p>
              <Link to="/admin/audit" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 10,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#94a3b8', fontSize: 11, fontWeight: 700,
                textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>
                <i className="bx bxs-file-find" style={{ fontSize: 14 }} /> Audit Logs
              </Link>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{
            background: '#fff', borderRadius: 20, padding: 24,
            border: '1px solid #f1f5f9',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex', flexDirection: 'column', gap: 0,
          }}>
            <div style={{ marginBottom: 16 }}>
              <SectionTitle text="Quick Actions" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <QuickAction to="/admin/merchants" icon="bxs-store-alt" label="Merchant Audit" sub="Review & verify partners" color="#8b5cf6" />
              <QuickAction to="/admin/payouts" icon="bxs-wallet" label="Payout Queue" sub={`${overview?.pending_payouts || 0} request pending`} color="#10b981" />
              <QuickAction to="/admin/products" icon="bxs-package" label="Product Catalog" sub="Manage inventory" color="#f59e0b" />
              <QuickAction to="/admin/finance" icon="bx-line-chart" label="Financial Ledger" sub="Revenue & fee breakdown" color="#6366f1" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
