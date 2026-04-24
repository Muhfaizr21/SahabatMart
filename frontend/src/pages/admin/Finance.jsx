import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';
import { PageHeader, StatRow, TablePanel, idr, fmtDate, A } from '../../lib/adminStyles.jsx';

const API = ADMIN_API_BASE;

const TX_TYPES = {
  commission_earned:     { label: 'Komisi Masuk',       icon: 'bxs-plus-circle',   color: '#10b981' },
  commission_reversed:   { label: 'Komisi Ditarik',     icon: 'bxs-minus-circle',  color: '#ef4444' },
  sale_revenue:          { label: 'Penjualan',           icon: 'bxs-cart',          color: '#10b981' },
  sale_revenue_reversed: { label: 'Penjualan Dibatalkan',icon: 'bxs-error-circle', color: '#ef4444' },
  withdrawal_request:    { label: 'Penarikan Reserved', icon: 'bxs-hourglass',     color: '#f59e0b' },
  withdrawal_completed:  { label: 'Penarikan Selesai',  icon: 'bxs-check-circle',  color: '#6366f1' },
  platform_fee:          { label: 'Fee Platform',       icon: 'bxs-building-house',color: '#2563eb' },
  refund_deduction:      { label: 'Potongan Refund',    icon: 'bx-undo',           color: '#dc2626' },
  restock_payment:       { label: 'Pembayaran Kulakan', icon: 'bxs-package',       color: '#f59e0b' },
  restock_revenue:       { label: 'Pendapatan Kulakan', icon: 'bxs-chevrons-up',    color: '#10b981' },
  bonus:                 { label: 'Bonus / Reward',     icon: 'bxs-award',         color: '#8b5cf6' },
  adjustment:            { label: 'Penyesuaian Saldo',  icon: 'bx-git-commit',     color: '#64748b' },
};

const TAB_LIST = [
  { val: 'overview', icon: 'bxs-dashboard', label: 'Summary' },
  { val: 'transactions', icon: 'bx-transfer', label: 'Transactions' },
  { val: 'ledger', icon: 'bxs-file-find', label: 'Ledger Audit' },
];

export default function AdminFinance() {
  const [overview, setOverview] = useState(null);
  const [monthly,  setMonthly]  = useState([]);
  const [txList,   setTxList]   = useState([]);
  const [ledger,   setLedger]   = useState([]);
  const [tab,      setTab]      = useState('overview');
  const [loading,  setLoading]  = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');

  // Load overview + monthly on mount
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchJson(`${API}/finance`),
      fetchJson(`${API}/finance/monthly`),
    ]).then(([ov, mo]) => {
      setOverview(ov);
      const data = Array.isArray(mo) ? mo : (mo.data || []);
      setMonthly(data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Load tab-specific data
  useEffect(() => {
    if (tab === 'transactions') {
      const params = new URLSearchParams();
      if (dateFrom) params.append('from', dateFrom);
      if (dateTo)   params.append('to', dateTo);
      fetchJson(`${API}/finance/transactions?${params}`).then(d => setTxList(d || []));
    }
    if (tab === 'ledger') {
      fetchJson(`${API}/finance/ledger`).then(d => setLedger(d || []));
    }
  }, [tab]);

  const filterTx = () => {
    const params = new URLSearchParams();
    if (dateFrom) params.append('from', dateFrom);
    if (dateTo)   params.append('to', dateTo);
    fetchJson(`${API}/finance/transactions?${params}`).then(d => setTxList(d || []));
  };

  const maxRevenue = Math.max(...monthly.map(m => m.revenue), 1);

  return (
    <div style={A.page} className="fade-in">
      <PageHeader title="Financial Integrity" subtitle="Laporan keuangan, transaksi, dan audit trail platform.">
        <button style={A.btnGhost} onClick={() => window.location.reload()}>
          <i className="bx bx-refresh" /> Refresh
        </button>
      </PageHeader>

      <StatRow stats={[
        { label: 'Total Revenue',   val: loading ? '...' : idr(overview?.total_revenue),    icon: 'bxs-dollar-circle', color: '#6366f1' },
        { label: 'Net Profit (HQ)', val: loading ? '...' : idr(overview?.net_profit),       icon: 'bxs-chart',         color: '#10b981' },
        { label: 'Total COGS',      val: loading ? '...' : idr(overview?.total_cogs),       icon: 'bxs-package',       color: '#ef4444' },
        { label: 'Platform Fee',    val: loading ? '...' : idr(overview?.total_platform_fee),icon: 'bxs-building-house',color: '#8b5cf6' },
      ]} />

      {/* Tab Switch */}
      <div style={{ display:'flex', background:'#f8fafc', padding:4, borderRadius:14, border:'1px solid #f1f5f9', gap:4, alignSelf:'flex-start' }}>
        {TAB_LIST.map(t => (
          <button key={t.val} style={{
            display:'flex', alignItems:'center', gap:7,
            padding:'9px 20px', borderRadius:11, border:'none',
            fontWeight:700, fontSize:13, cursor:'pointer',
            background: tab===t.val ? '#fff' : 'transparent',
            color: tab===t.val ? '#0f172a' : '#94a3b8',
            boxShadow: tab===t.val ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            transition:'all 0.15s',
          }} onClick={() => setTab(t.val)}>
            <i className={`bx ${t.icon}`} style={{ fontSize:16 }} />{t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && (
        <>
          {/* Bar Chart */}
          <div style={{ background:'#fff', borderRadius:16, border:'1px solid #f1f5f9', padding:'24px 28px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <div style={{ fontSize:15, fontWeight:800, color:'#0f172a' }}>Monthly Revenue Growth</div>
              <span style={{ fontSize:11, padding:'4px 12px', borderRadius:20, background:'#eef2ff', color:'#6366f1', fontWeight:700 }}>Real-time Data</span>
            </div>
            {monthly.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px', color:'#94a3b8', fontSize:13 }}>Tidak ada data historis.</div>
            ) : (
              <div style={{ display:'flex', alignItems:'flex-end', gap:10, height:180 }}>
                {monthly.map(m => {
                  const h = (m.revenue / maxRevenue) * 100;
                  return (
                    <div key={m.month} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6, height:'100%', justifyContent:'flex-end' }}>
                      <div style={{ fontSize:10, fontWeight:800, color:'#6366f1', whiteSpace:'nowrap' }}>
                        {idr(m.revenue).replace('Rp\u00a0', '').replace('Rp', '')}
                      </div>
                      <div style={{ width:'100%', height:`${Math.max(h, 4)}%`, background:'linear-gradient(180deg,#818cf8,#6366f1)', borderRadius:'8px 8px 0 0', opacity:0.85 }} />
                      <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', fontFamily:'monospace' }}>{m.month?.slice(5)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Monthly Table */}
          <TablePanel loading={false}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:560 }}>
              <thead>
                <tr>
                  {['Period','Gross Revenue','HQ Profit','Platform Fee','Margin'].map((h,i) => (
                    <th key={h} style={{ ...A.th, textAlign:i===4?'right':'left', paddingLeft:i===0?24:16, paddingRight:i===4?24:16 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthly.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding:'40px', textAlign:'center', color:'#94a3b8' }}>Tidak ada data.</td></tr>
                ) : monthly.map((m, idx) => (
                  <tr key={m.month}
                    style={{ background:idx%2===0?'#fff':'#fafafa' }}
                    onMouseEnter={e=>e.currentTarget.style.background='#f5f7ff'}
                    onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?'#fff':'#fafafa'}
                  >
                    <td style={{ ...A.td, paddingLeft:24 }}>
                      <span style={{ fontFamily:'monospace', fontWeight:800, color:'#0f172a' }}>{m.month}</span>
                    </td>
                    <td style={A.td}><span style={{ fontWeight:700, color:'#0f172a' }}>{idr(m.revenue)}</span></td>
                    <td style={A.td}><span style={{ fontWeight:700, color:'#10b981' }}>{idr(m.profit)}</span></td>
                    <td style={A.td}><span style={{ fontWeight:700, color:'#6366f1' }}>{idr(m.fee)}</span></td>
                    <td style={{ ...A.td, paddingRight:24, textAlign:'right' }}>
                      <span style={{ display:'inline-flex', padding:'4px 12px', borderRadius:20, background:'#eef2ff', color:'#6366f1', fontWeight:800, fontSize:12, fontFamily:'monospace' }}>
                        {(m.revenue > 0 ? (m.profit/m.revenue)*100 : 0).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TablePanel>
        </>
      )}

      {/* ── TRANSACTIONS TAB ── */}
      {tab === 'transactions' && (
        <>
          {/* Date Filter */}
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 20px', background:'#fff', borderRadius:14, border:'1px solid #f1f5f9', flexWrap:'wrap' }}>
            <i className="bx bx-calendar" style={{ color:'#94a3b8', fontSize:18 }} />
            <input
              type="date"
              style={{ ...A.select, width:160 }}
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
            />
            <span style={{ fontSize:12, fontWeight:700, color:'#94a3b8' }}>s/d</span>
            <input
              type="date"
              style={{ ...A.select, width:160 }}
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
            />
            <button style={{ ...A.btnPrimary, marginLeft:'auto' }} onClick={filterTx}>
              <i className="bx bx-filter-alt" /> Filter
            </button>
          </div>
          <TablePanel loading={false}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:640 }}>
              <thead>
                <tr>
                  {['Serial ID','Merchant','Order Total','Commission','Status'].map((h,i) => (
                    <th key={h} style={{ ...A.th, textAlign:i===4?'right':'left', paddingLeft:i===0?24:16, paddingRight:i===4?24:16 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txList.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding:'60px', textAlign:'center', color:'#94a3b8' }}>
                    <i className="bx bx-transfer" style={{ fontSize:40, display:'block', marginBottom:8, opacity:0.2 }} />
                    Pilih rentang tanggal dan klik Filter.
                  </td></tr>
                ) : txList.map((t, idx) => (
                  <tr key={t.id}
                    style={{ background:idx%2===0?'#fff':'#fafafa' }}
                    onMouseEnter={e=>e.currentTarget.style.background='#f5f7ff'}
                    onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?'#fff':'#fafafa'}
                  >
                    <td style={{ ...A.td, paddingLeft:24 }}>
                      <span style={{ fontFamily:'monospace', fontWeight:800, color:'#0f172a', fontSize:13 }}>{t.id?.slice(0,8).toUpperCase()}</span>
                    </td>
                    <td style={A.td}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:20, background:'#eff6ff', color:'#2563eb', fontSize:12, fontWeight:700 }}>
                        <i className="bx bxs-store-alt" style={{ fontSize:13 }} />{t.store_name}
                      </span>
                    </td>
                    <td style={A.td}><span style={{ fontWeight:800, color:'#0f172a' }}>{idr(t.subtotal)}</span></td>
                    <td style={A.td}><span style={{ fontWeight:800, color:'#10b981' }}>{idr(t.platform_fee)}</span></td>
                    <td style={{ ...A.td, paddingRight:24, textAlign:'right' }}>
                      <span style={{ display:'inline-flex', padding:'4px 12px', borderRadius:20, background:'#f0fdf4', color:'#16a34a', fontSize:11, fontWeight:700 }}>
                        {t.status?.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TablePanel>
        </>
      )}

      {/* ── LEDGER AUDIT TAB ── */}
      {tab === 'ledger' && (
        <>
          {/* Banner */}
          <div style={{ display:'flex', alignItems:'center', gap:16, padding:'16px 20px', background:'#eef2ff', borderRadius:14, border:'1px solid #c7d2fe' }}>
            <div style={{ width:44, height:44, borderRadius:12, background:'#6366f1', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <i className="bx bxs-shield-check" style={{ fontSize:22, color:'#fff' }} />
            </div>
            <div>
              <div style={{ fontWeight:800, color:'#3730a3', fontSize:14 }}>Immutable Financial Ledger</div>
              <div style={{ fontSize:12, color:'#4f46e5', marginTop:2 }}>Atomic reconciliation log dengan 99.9% data integrity via Postgres Engine.</div>
            </div>
            <button style={{ ...A.btnGhost, marginLeft:'auto', fontSize:12 }} onClick={() => fetchJson(`${API}/finance/ledger`).then(d => setLedger(d || []))}>
              <i className="bx bx-refresh" /> Reload
            </button>
          </div>

          <TablePanel loading={false}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:760 }}>
              <thead>
                <tr>
                  {['Timestamp','Operation Type','Amount Flow','Post-Balance','Liabilities','Reference ID'].map((h,i) => (
                    <th key={h} style={{ ...A.th, textAlign:i===5?'right':'left', paddingLeft:i===0?24:16, paddingRight:i===5?24:16 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ledger.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding:'60px', textAlign:'center', color:'#94a3b8' }}>
                    <i className="bx bxs-file-archive" style={{ fontSize:40, display:'block', marginBottom:8, opacity:0.2 }} />
                    Awaiting initial entries for audit trail.
                  </td></tr>
                ) : ledger.map((l, idx) => {
                  const tc = TX_TYPES[l.type];
                  const isDebit = l.amount < 0;
                  return (
                    <tr key={l.id}
                      style={{ background:idx%2===0?'#fff':'#fafafa' }}
                      onMouseEnter={e=>e.currentTarget.style.background='#f5f7ff'}
                      onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?'#fff':'#fafafa'}
                    >
                      <td style={{ ...A.td, paddingLeft:24 }}>
                        <span style={{ fontFamily:'monospace', fontSize:12, fontWeight:700, color:'#334155' }}>{new Date(l.created_at).toLocaleString('id-ID')}</span>
                      </td>
                      <td style={A.td}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ width:30, height:30, borderRadius:9, background:(tc?.color||'#94a3b8')+'14', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            <i className={`bx ${tc?.icon||'bx-info-circle'}`} style={{ fontSize:15, color:tc?.color||'#94a3b8' }} />
                          </div>
                          <span style={{ fontWeight:600, color:'#0f172a', fontSize:13 }}>{tc?.label || l.type}</span>
                        </div>
                      </td>
                      <td style={A.td}>
                        <span style={{ fontFamily:'monospace', fontWeight:800, fontSize:14, color:isDebit?'#dc2626':'#16a34a' }}>
                          {isDebit ? '−' : '+'}{idr(Math.abs(l.amount))}
                        </span>
                      </td>
                      <td style={A.td}>
                        <span style={{ fontFamily:'monospace', fontWeight:800, color:'#0f172a' }}>{idr(l.balance_after)}</span>
                      </td>
                      <td style={A.td}>
                        <span style={{ fontFamily:'monospace', fontSize:12, color:'#94a3b8' }}>{idr(l.pending_after)}</span>
                      </td>
                      <td style={{ ...A.td, paddingRight:24, textAlign:'right' }}>
                        <code style={{ fontSize:11, fontFamily:'monospace', color:'#64748b', background:'#f1f5f9', padding:'3px 8px', borderRadius:6 }}>{l.reference_id?.slice(0,14)}</code>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!loading && ledger.length > 0 && (
              <div style={{ padding:'12px 24px', borderTop:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:12.5, color:'#94a3b8' }}>Total <strong style={{ color:'#475569' }}>{ledger.length}</strong> entri</span>
                <span style={{ fontSize:11, color:'#cbd5e1' }}>Immutable — read-only</span>
              </div>
            )}
          </TablePanel>
        </>
      )}
    </div>
  );
}
