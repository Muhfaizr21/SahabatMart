import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';
import { PageHeader, StatRow, TablePanel, Modal, FieldLabel, statusBadge, idr, fmtDate, A } from '../../lib/adminStyles.jsx';

const API = ADMIN_API_BASE;

export default function AdminPayouts() {
  const [payouts, setPayouts] = useState([]);
  const [tab, setTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState('');

  const load = () => {
    setLoading(true);
    fetchJson(`${API}/payouts${tab ? `?status=${tab}` : ''}`)
      .then(d => setPayouts(d.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [tab]);

  const processPayout = (status) => {
    if (!selected) return;
    setProcessing(true);
    fetchJson(`${API}/payouts/process`, {
      method: 'PUT',
      body: JSON.stringify({ payout_id: selected.id, status, note, processed_by: 'admin-system' }),
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
    { val: 'rejected', label: 'Rejected' },
  ];

  return (
    <div style={A.page} className="fade-in">
      <PageHeader title="Corporate Settlement & Payouts" subtitle="Kelola arus kas keluar platform. Pastikan setiap pencairan dana merchant divalidasi dan tercatat.">
        <button style={A.btnGhost} onClick={load}><i className={`bx bx-refresh ${loading?'bx-spin':''}`} /> Force Sync</button>
      </PageHeader>

      <StatRow stats={[
        { label: 'Outbound Queue', val: pendingRequests.length, icon: 'bx-history', color: '#6366f1' },
        { label: 'Pending Volume', val: idr(totalPendingVolume), icon: 'bx-dollar-circle', color: '#f59e0b' },
        { label: 'Settled volume', val: idr(payouts.filter(p=>p.status==='paid').reduce((s,p)=>s+(p.amount||0),0)), icon: 'bx-check-double', color: '#10b981' },
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
              {['Transaction ID','Merchant Profile','Settlement Amount','Status','Notes','Request Date','Action'].map((h,i)=>(
                <th key={h} style={{ ...A.th, textAlign:i===6?'right':'left', paddingLeft:i===0?24:16, paddingRight:i===6?24:16 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payouts.length === 0 ? (
              <tr><td colSpan={7} style={{ padding:'80px 20px', textAlign:'center', color:'#94a3b8' }}>
                <i className="bx bx-receipt" style={{ fontSize:52, display:'block', marginBottom:12, opacity:0.2 }} />
                <div style={{ fontWeight:700 }}>No payout history found in this sector.</div>
              </td></tr>
            ) : payouts.map((p, idx) => (
              <tr key={p.id}
                style={{ background: idx%2===0?'#fff':'#fafafa' }}
                onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?'#fff':'#fafafa'}
              >
                <td style={{ ...A.td, paddingLeft:24 }}>
                  <span style={{ fontFamily:'monospace', fontSize:13, fontWeight:800, color:'#0f172a' }}>TRX-{p.id?.slice(0,8).toUpperCase()}</span>
                </td>
                <td style={A.td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                     <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5', fontWeight: 800, fontSize: 10 }}>ID</div>
                     <span style={{ fontFamily:'monospace', fontSize:11, color:'#64748b' }}>{p.merchant_id?.slice(0,16)}...</span>
                  </div>
                </td>
                <td style={A.td}>
                  <span style={{ fontWeight:900, color:'#0f172a', fontSize:16, letterSpacing: '-0.02em' }}>{idr(p.amount)}</span>
                </td>
                <td style={A.td}>
                   <div style={statusBadge(p.status)}>{p.status?.toUpperCase()}</div>
                </td>
                <td style={{ ...A.td, maxWidth:180 }}>
                  <span style={{ fontSize:12, color:'#64748b', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', display:'block' }}>{p.note||'—'}</span>
                </td>
                <td style={A.td}><span style={{ fontSize:12.5, fontWeight: 500 }}>{fmtDate(p.requested_at)}</span></td>
                <td style={{ ...A.td, paddingRight:24, textAlign:'right' }}>
                  {(p.status === 'pending' || p.status === 'approved') && (
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

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
            <button onClick={()=>setSelected(null)} style={{ padding:'12px', borderRadius:12, border:'1px solid #e2e8f0', background:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', color:'#64748b' }}>
              Cancel
            </button>
            <button
              onClick={()=>processPayout('rejected')}
              disabled={processing}
              style={{ padding:'12px', borderRadius:12, border:'none', background:'#fff1f2', color:'#dc2626', fontWeight:800, fontSize:13, cursor:'pointer' }}
            >
              <i className="bx bx-x-circle" /> Reject
            </button>
            <button
              onClick={()=>processPayout('paid')}
              disabled={processing}
              style={{ ...A.btnPrimary, background:'linear-gradient(135deg,#10b981,#059669)', justifyContent:'center', padding:'12px', boxShadow: '0 8px 20px rgba(16,185,129,0.3)' }}
            >
              {processing ? '...' : <><i className="bx bx-check-double" /> Settle Now</>}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
