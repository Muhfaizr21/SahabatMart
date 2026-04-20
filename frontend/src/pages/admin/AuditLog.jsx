import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';
import { PageHeader, TablePanel, Modal, FieldLabel, idr, fmtDate, A } from '../../lib/adminStyles.jsx';

const API = ADMIN_API_BASE;

const ACTION_COLORS = {
  login:                  '#6366f1',
  logout:                 '#64748b',
  create_product:         '#10b981',
  update_product:         '#0891b2',
  delete_product:         '#ef4444',
  moderate_product:       '#f59e0b',
  update_merchant_status: '#8b5cf6',
  verify_merchant:        '#10b981',
  update_order_status:    '#6366f1',
  process_payout:         '#0f172a',
  update_user:            '#ea580c',
};

const ACTION_ICONS = {
  login: 'bx-log-in-circle', logout: 'bx-log-out-circle',
  create_product: 'bxs-package', update_product: 'bx-edit',
  delete_product: 'bx-trash', moderate_product: 'bxs-check-shield',
  update_merchant_status: 'bxs-store-alt', verify_merchant: 'bxs-badge-check',
  update_order_status: 'bxs-receipt', process_payout: 'bxs-wallet',
  update_user: 'bxs-user-account',
};

export default function AdminAuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const load = () => {
    setLoading(true);
    fetchJson(`${API}/audit-logs?search=${search}&action=${actionFilter}`)
      .then(d => setLogs(d || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [actionFilter]);

  return (
    <div style={A.page} className="fade-in">
      <PageHeader title="Audit Log" subtitle="Seluruh aktivitas administrator tercatat untuk kepatuhan keamanan.">
        <div style={A.searchWrap}>
          <i className="bx bx-search" style={A.searchIcon} />
          <input style={A.searchInput} placeholder="Cari detail log..." value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&load()} />
        </div>
        <select style={A.select} value={actionFilter} onChange={e=>setActionFilter(e.target.value)}>
          <option value="">Semua Event</option>
          <option value="login">Access Events</option>
          <option value="create_product">Inventory Changes</option>
          <option value="update_merchant_status">Merchant Status</option>
          <option value="process_payout">Financial</option>
        </select>
        <button style={A.btnGhost} onClick={load}><i className="bx bx-refresh" /></button>
      </PageHeader>

      {/* Security Banner */}
      <div style={{
        display:'flex', alignItems:'center', gap:14, padding:'14px 20px',
        background:'#fefce8', borderRadius:14, border:'1px solid #fde68a',
      }}>
        <div style={{ width:40, height:40, borderRadius:11, background:'#f59e0b', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <i className="bx bxs-shield-quarter" style={{ fontSize:20, color:'#fff' }} />
        </div>
        <div>
          <div style={{ fontSize:13.5, fontWeight:800, color:'#92400e', marginBottom:2 }}>Sentinel Monitoring Active</div>
          <div style={{ fontSize:12, color:'#b45309', fontWeight:500 }}>Semua tindakan admin dicatat secara permanen untuk audit keamanan.</div>
        </div>
      </div>

      <TablePanel loading={loading}>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:760 }}>
          <thead>
            <tr>
              {['Timestamp','Operator','Action / Event','Target','Detail Log'].map((h,i)=>(
                <th key={h} style={{ ...A.th, paddingLeft:i===0?24:16 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan={5} style={{ padding:'64px 20px', textAlign:'center', color:'#94a3b8' }}>
                <i className="bx bxs-file-find" style={{ fontSize:44, display:'block', marginBottom:10, opacity:0.3 }} />
                Tidak ada log yang cocok.
              </td></tr>
            ) : logs.map((log, idx) => {
              const ac = ACTION_COLORS[log.action] || '#6366f1';
              const ai = ACTION_ICONS[log.action] || 'bx-info-circle';
              return (
                <tr key={log.id}
                  style={{ background:idx%2===0?'#fff':'#fafafa' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#f5f7ff'}
                  onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?'#fff':'#fafafa'}
                >
                  <td style={{ ...A.td, paddingLeft:24 }}>
                    <div style={{ fontFamily:'monospace', fontSize:12.5, fontWeight:700, color:'#0f172a' }}>{new Date(log.created_at).toLocaleString('id-ID')}</div>
                    <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{log.ip_address||'—'}</div>
                  </td>
                  <td style={A.td}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:34, height:34, borderRadius:10, background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <i className="bx bxs-user-account" style={{ fontSize:16, color:'#64748b' }} />
                      </div>
                      <span style={{ fontFamily:'monospace', fontSize:12, fontWeight:700, color:'#0f172a' }}>{log.admin_id?.slice(0,12)}…</span>
                    </div>
                  </td>
                  <td style={A.td}>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:20, background:ac+'14', color:ac, fontSize:11.5, fontWeight:700 }}>
                      <i className={`bx ${ai}`} style={{ fontSize:13 }} />
                      {log.action.toUpperCase().replace(/_/g,' ')}
                    </span>
                  </td>
                  <td style={A.td}>
                    <span style={{ display:'inline-flex', padding:'3px 10px', borderRadius:20, background:'#f1f5f9', color:'#64748b', fontSize:11.5, fontWeight:700 }}>{log.target_type||'—'}</span>
                  </td>
                  <td style={{ ...A.td, maxWidth:280 }}>
                    <div style={{ fontSize:12, color:'#475569', fontFamily:'monospace', background:'#f8fafc', padding:'8px 12px', borderRadius:8, borderLeft:'3px solid #e2e8f0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {log.detail||'—'}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TablePanel>
    </div>
  );
}
