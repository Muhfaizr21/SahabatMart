import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';
import { PageHeader, StatRow, TablePanel, Modal, FieldLabel, statusBadge, idr, fmtDate, A } from '../../lib/adminStyles.jsx';

const API = ADMIN_API_BASE;

export default function AdminPayouts() {
  const [payouts, setPayouts] = useState([]);
  const [tab, setTab] = useState(''); // Default to All History as requested
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState('');

  const load = () => {
    setLoading(true);
    fetchJson(`${API}/payouts${tab ? `?status=${tab}` : ''}`)
      .then(d => setPayouts(Array.isArray(d) ? d : (d?.data || [])))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [tab]);

  const processPayout = (status) => {
    if (!selected) return;
    setProcessing(true);
    fetchJson(`${API}/payouts/process`, {
      method: 'PUT',
      body: JSON.stringify({ payout_id: selected.id, type: selected.type, status, note }),
    }).then(() => {
      setToast(`Payout request ${status === 'paid' ? 'marked as settled' : status === 'approved' ? 'approved for payment' : 'rejected'}`);
      setTimeout(() => setToast(''), 4000);
      setSelected(null); setNote(''); load();
    }).catch(err => alert(err.message))
    .finally(() => setProcessing(false));
  };

  const pendingRequests = payouts.filter(p => p.status === 'pending');
  const totalPendingVolume = pendingRequests.reduce((s,p) => s + (p.amount||0), 0);

  const TABS = [
    { val: '', label: 'All History' },
    { val: 'pending', label: 'Withdrawal Queue' },
    { val: 'approved', label: 'Pending Settlement' },
    { val: 'paid', label: 'Settled' },
    { val: 'rejected', label: 'Rejected Records' },
  ];

  return (
    <div style={A.page} className="fade-in">
      <PageHeader title="Corporate Settlement & Payouts" subtitle="Kelola arus kas keluar platform. Pastikan setiap pencairan dana merchant & affiliate divalidasi dan tercatat.">
        <button style={A.btnGhost} onClick={load}><i className={`bx bx-refresh ${loading?'bx-spin':''}`} /> Force Sync</button>
      </PageHeader>

      <StatRow stats={[
        { label: 'Outbound Queue', val: pendingRequests.length, icon: 'bx-history', color: '#6366f1' },
        { label: 'Pending Volume', val: idr(totalPendingVolume), icon: 'bx-dollar-circle', color: '#f59e0b' },
        { label: 'Settled volume', val: idr(payouts.filter(p=>p.status==='paid' || p.status==='completed').reduce((s,p)=>s+(p.amount||0),0)), icon: 'bx-check-double', color: '#10b981' },
      ]} />

      {toast && (
        <div style={{ padding:'14px 24px', borderRadius:14, background:'#f0fdf4', border:'1px solid #bbf7d0', color:'#15803d', fontWeight:800, fontSize:13.5, display:'flex', alignItems:'center', gap:10, marginBottom: 24, boxShadow: '0 4px 12px rgba(16,185,129,0.1)' }}>
          <i className="bx bxs-check-shield" style={{ fontSize:20 }} /> {toast}
        </div>
      )}

      <TablePanel
        loading={loading}
        tabs={TABS.map(t => <button key={t.val} style={A.tab(tab===t.val)} onClick={()=>setTab(t.val)}>{t.label}</button>)}
      >
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:800 }}>
          <thead>
            <tr>
              {['Transaction ID','Type','Recipient Profile','Amount','Status','Admin Note','Review Date','Action'].map((h,i)=>(
                <th key={h} style={{ ...A.th, textAlign:i===7?'right':'left', paddingLeft:i===0?24:16, paddingRight:i===7?24:16 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payouts.length === 0 ? (
              <tr><td colSpan={8} style={{ padding:'80px 20px', textAlign:'center', color:'#94a3b8' }}>
                <i className="bx bx-receipt" style={{ fontSize:52, display:'block', marginBottom:12, opacity:0.2 }} />
                <div style={{ fontWeight:700 }}>No payout history found in this sector.</div>
              </td></tr>
            ) : payouts.map((p, idx) => (
              <tr key={`${p.type}-${p.id}`}
                style={{ 
                  background: idx%2===0?'#fff':'#fafafa',
                  opacity: p.status === 'rejected' ? 0.6 : 1,
                  textDecoration: p.status === 'rejected' ? 'line-through' : 'none'
                }}
                onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?'#fff':'#fafafa'}
              >
                <td style={{ ...A.td, paddingLeft:24 }}>
                  <span style={{ fontFamily:'monospace', fontSize:13, fontWeight:800, color:'#0f172a' }}>TRX-{p.id?.slice(0,8).toUpperCase()}</span>
                </td>
                <td style={A.td}>
                   <div style={{ 
                     fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 6, display: 'inline-block',
                     background: p.type === 'merchant' ? '#eef2ff' : '#f0fdf4',
                     color: p.type === 'merchant' ? '#6366f1' : '#10b981',
                     border: '1px solid ' + (p.type === 'merchant' ? '#e0e7ff' : '#dcfce7')
                   }}>
                     {p.type?.toUpperCase()}
                   </div>
                </td>
                <td style={A.td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                     <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: 800, fontSize: 10 }}>
                        {p.type === 'merchant' ? <i className="bx bx-store" /> : <i className="bx bx-user" />}
                     </div>
                     <div>
                        <div style={{ fontSize:13, fontWeight:800, color:'#0f172a' }}>{p.name}</div>
                        <div style={{ fontSize:11, color:'#64748b' }}>{p.sub_name}</div>
                     </div>
                  </div>
                </td>
                <td style={A.td}>
                  <span style={{ fontWeight:900, color:'#0f172a', fontSize:15, letterSpacing: '-0.02em' }}>{idr(p.amount)}</span>
                </td>
                <td style={A.td}>
                   <div style={statusBadge(p.status)}>{p.status?.toUpperCase()}</div>
                </td>
                <td style={{ ...A.td, maxWidth:180 }}>
                  <span style={{ fontSize:12, color:'#64748b', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', display:'block' }}>{p.note||'—'}</span>
                </td>
                <td style={A.td}><span style={{ fontSize:12.5, fontWeight: 500 }}>{p.processed_at ? fmtDate(p.processed_at) : fmtDate(p.requested_at)}</span></td>
                <td style={{ ...A.td, paddingRight:24, textAlign:'right' }}>
                  {(p.status === 'pending' || p.status === 'approved' || p.status === 'processed') && (
                    <button style={A.iconBtn('#6366f1','#f0f4ff')} onClick={()=>{setSelected(p);setNote('');}} title="Process Settlement">
                      <i className="bx bx-cog" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TablePanel>

      {selected && (
        <Modal title="Financial Settlement Action" onClose={()=>setSelected(null)}>
          <div style={{ background:'#0f172a', borderRadius:16, padding:'24px', marginBottom:20, color: '#fff', boxShadow: '0 20px 40px rgba(15,23,42,0.2)' }}>
            <div style={{ fontSize:10, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6 }}>Withdrawal Amount</div>
            <div style={{ fontSize:32, fontWeight:900, color:'#fff', letterSpacing:'-0.05em' }}>{idr(selected.amount)}</div>
            <div style={{ fontSize:11, color:'#64748b', fontFamily:'monospace', marginTop:8, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8 }}>Merchant Reference: {selected.merchant_id}</div>
          </div>

          <div style={{ marginBottom:20 }}>
            <FieldLabel>Official Recording Note</FieldLabel>
            <textarea
              style={{ ...A.textarea, minHeight:100 }}
              placeholder="e.g., Wire transfer successful via Treasury Bank ID #889..."
              value={note}
              onChange={e=>setNote(e.target.value)}
            />
          </div>

          <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
            <button onClick={()=>setSelected(null)} style={{ flex: 1, minWidth: '100px', padding:'12px', borderRadius:12, border:'1px solid #e2e8f0', background:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', color:'#64748b' }}>
              Cancel
            </button>
            <button
              onClick={()=>processPayout('rejected')}
              disabled={processing}
              style={{ flex: 1, minWidth: '100px', padding:'12px', borderRadius:12, border:'none', background:'#fff1f2', color:'#dc2626', fontWeight:800, fontSize:13, cursor:'pointer' }}
            >
              <i className="bx bx-x-circle" /> Reject
            </button>
            {(selected.status === 'pending') && (
              <button
                onClick={()=>processPayout('approved')}
                disabled={processing}
                style={{ ...A.btnPrimary, flex: 1, minWidth: '120px', background:'#6366f1', justifyContent:'center', padding:'12px' }}
              >
                {processing ? '...' : <><i className="bx bx-check" /> Approve</>}
              </button>
            )}
            {(selected.status === 'pending' || selected.status === 'approved' || selected.status === 'processed') && (
              <button
                onClick={()=>processPayout('paid')}
                disabled={processing}
                style={{ ...A.btnPrimary, flex: 2, minWidth: '150px', background:'linear-gradient(135deg,#10b981,#059669)', justifyContent:'center', padding:'12px', boxShadow: '0 8px 20px rgba(16,185,129,0.3)' }}
              >
                {processing ? '...' : <><i className="bx bx-check-double" /> Settle & Mark Paid</>}
              </button>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
