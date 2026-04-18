import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';
import { PageHeader, StatRow, TablePanel, Modal, FieldLabel, A, statusBadge } from '../../lib/adminStyles.jsx';

const API = ADMIN_API_BASE;

export default function AdminDisputes() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [decision, setDecision] = useState({ status:'refund_approved', note:'' });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    fetchJson(`${API}/disputes`)
      .then(d => setDisputes(d.data || []))
      .catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const arbitrate = () => {
    if (!selected) return;
    setSubmitting(true);
    fetchJson(`${API}/disputes/arbitrate`, {
      method:'POST',
      body:JSON.stringify({ id:selected.id, status:decision.status, decision_note:decision.note, decided_by:'judicial-admin' }),
    }).then(() => {
      load(); setSelected(null); setDecision({ status:'refund_approved', note:'' });
    }).catch(err => alert(err.message))
    .finally(() => setSubmitting(false));
  };

  const openCount = disputes.filter(d => d.status === 'open').length;

  return (
    <div style={A.page} className="fade-in">
      <PageHeader title="Judicial Dispute Center" subtitle="Arbitrasi tingkat tinggi untuk sengketa transaksi. Berikan keputusan adil untuk Merchant dan Buyer.">
        <button style={A.btnGhost} onClick={load}><i className={`bx bx-refresh ${loading?'bx-spin':''}`} /> Force Refresh</button>
      </PageHeader>

      <StatRow stats={[
        { label: 'Pending Cases', val: openCount, icon: 'bx-error-circle', color: '#dc2626' },
        { label: 'Settled Cases', val: disputes.filter(d=>d.status!=='open').length, icon: 'bx-check-double', color: '#10b981' },
        { label: 'High Priority', val: disputes.filter(d=>d.amount > 1000000).length, icon: 'bx-trending-up', color: '#f59e0b' },
      ]} />

      {openCount > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:14, padding:'16px 24px', background:'rgba(220,38,38,0.05)', borderRadius:16, border:'1px solid rgba(220,38,38,0.2)', marginBottom: 24 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:'#dc2626', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow: '0 8px 16px rgba(220,38,38,0.25)' }}>
            <i className="bx bxs-gavel" style={{ fontSize:22, color:'#fff' }} />
          </div>
          <div>
            <div style={{ fontSize:15, fontWeight:900, color:'#9f1239', letterSpacing: '-0.02em' }}>{openCount} Sengketa Memerlukan Tindakan Segera</div>
            <div style={{ fontSize:12.5, color:'#be123c', fontWeight: 500 }}>Keputusan arbitrasi Anda akan mempengaruhi aliran dana escrow secara real-time.</div>
          </div>
        </div>
      )}

      <TablePanel loading={loading}>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:800 }}>
          <thead>
            <tr>
              {['Case Reference','Reasoning & Grounds','Buyer ID','Status','Judicial Action'].map((h,i)=>(
                <th key={h} style={{ ...A.th, textAlign:i===4?'right':'left', paddingLeft:i===0?24:16, paddingRight:i===4?24:16 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {disputes.length === 0 ? (
              <tr><td colSpan={5} style={{ padding:'80px 20px', textAlign:'center', color:'#94a3b8' }}>
                <i className="bx bx-check-shield" style={{ fontSize:64, display:'block', marginBottom:12, opacity:0.1, color:'#10b981' }} />
                <div style={{ fontWeight:800, color: '#475569' }}>Ekosistem Bersih</div>
                <div style={{ fontSize: 13 }}>Tidak ada sengketa transaksi yang dilaporkan saat ini.</div>
              </td></tr>
            ) : disputes.map((d, idx) => (
              <tr key={d.id}
                style={{ background:idx%2===0?'#fff':'#fafafa' }}
                onMouseEnter={e=>e.currentTarget.style.background='#fff5f5'}
                onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?'#fff':'#fafafa'}
              >
                <td style={{ ...A.td, paddingLeft:24 }}>
                  <div style={{ fontWeight:800, color:'#6366f1', fontSize:14, fontFamily: 'monospace' }}>DS-{d.order_id?.slice(0,8).toUpperCase()}</div>
                  <div style={{ fontSize:10, color:'#94a3b8', fontWeight: 700 }}>REF: #{d.id}</div>
                </td>
                <td style={{ ...A.td, maxWidth:250 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:'#0f172a', marginBottom: 2 }}>{d.reason}</div>
                  <div style={{ fontSize:11, color:'#64748b', fontWeight: 500 }}>Value in Dispute: <span style={{ color: '#0f172a', fontWeight: 800 }}>{idr(d.amount)}</span></div>
                </td>
                <td style={A.td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800 }}>B</div>
                    <span style={{ fontFamily:'monospace', fontSize:12.5, color:'#475569' }}>{d.buyer_id?.slice(0,12)}</span>
                  </div>
                </td>
                <td style={A.td}><div style={statusBadge(d.status)}>{d.status?.toUpperCase()}</div></td>
                <td style={{ ...A.td, paddingRight:24, textAlign:'right' }}>
                  {d.status === 'open' ? (
                    <button
                      onClick={() => setSelected(d)}
                      style={{ ...A.btnPrimary, background:'linear-gradient(135deg,#dc2626,#ef4444)', padding: '8px 16px', borderRadius: 12 }}
                    >
                      <i className="bx bx-gavel" /> Arbitrate
                    </button>
                  ) : (
                    <div style={{ display:'inline-flex', alignItems: 'center', gap: 6, fontSize:12, color:'#10b981', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                       <i className="bx bx-check-circle" /> Resolved
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TablePanel>

      {selected && (
        <Modal title="High-Level Arbitration" onClose={() => setSelected(null)}>
          <div style={{ background:'linear-gradient(to right, #f8fafc, #fff)', borderRadius:16, padding:'20px', marginBottom:20, borderLeft:'4px solid #dc2626', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize:11, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>Reported Dispute Cause</div>
            <div style={{ fontSize:15, color:'#0f172a', fontWeight:800, lineHeight: 1.5 }}>"{selected.reason}"</div>
            <div style={{ display: 'flex', gap: 20, marginTop:12, borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
               <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8' }}>AMOUNT</div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#dc2626' }}>{idr(selected.amount)}</div>
               </div>
               <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8' }}>ORDER UID</div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#0f172a' }}>#{selected.order_id?.slice(0,8).toUpperCase()}</div>
               </div>
            </div>
          </div>

          <div style={{ marginBottom:20 }}>
            <FieldLabel>Arbritration Final Verdict</FieldLabel>
            <select style={{ ...A.select, width:'100%', padding: 12, height: 'auto', fontWeight: 700 }} value={decision.status} onChange={e=>setDecision({...decision,status:e.target.value})}>
              <option value="refund_approved">✅ Approve Full Refund (Funds return to Buyer)</option>
              <option value="rejected">❌ Reject Dispute (Move funds to Merchant)</option>
              <option value="pending">⏳ Judicial Hold (Request further evidence)</option>
            </select>
          </div>

          <div style={{ marginBottom:24 }}>
            <FieldLabel>Verdict Rationale (Internal & Public)</FieldLabel>
            <textarea
              style={{ ...A.textarea, minHeight:120, fontSize: 14 }}
              placeholder="State the reasoning for this verdict. This will be visible to both parties."
              value={decision.note}
              onChange={e=>setDecision({...decision,note:e.target.value})}
            />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <button style={{ ...A.btnGhost, padding: 12 }} onClick={()=>setSelected(null)}>Cancel</button>
            <button
              onClick={arbitrate}
              disabled={!decision.note.trim() || submitting}
              style={{ ...A.btnPrimary, background:'linear-gradient(135deg,#0f172a,#334155)', justifyContent:'center', padding:'12px', fontSize: 13.5 }}
            >
              {submitting ? '...' : <><i className="bx bx-legal" /> Submit Verdict</>}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
