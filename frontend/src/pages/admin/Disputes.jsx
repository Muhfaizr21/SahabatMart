import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';
import { PageHeader, StatRow, TablePanel, Modal, FieldLabel, A } from '../../lib/adminStyles.jsx';

const API = ADMIN_API_BASE;

const D_STATUS = {
  open:             { color:'#dc2626', bg:'#fff1f2', label:'Terbuka' },
  pending:          { color:'#d97706', bg:'#fffbeb', label:'Menunggu Bukti' },
  refund_approved:  { color:'#16a34a', bg:'#f0fdf4', label:'Refund Disetujui' },
  rejected:         { color:'#64748b', bg:'#f1f5f9', label:'Ditolak' },
};

const DSpan = ({ status }) => {
  const s = D_STATUS[status] || D_STATUS.open;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:20, background:s.bg, color:s.color, fontSize:11, fontWeight:700 }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:s.color }} />
      {s.label}
    </span>
  );
};

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
    fetch(`${API}/disputes/arbitrate`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ id:selected.id, status:decision.status, decision_note:decision.note, decided_by:'admin-super' }),
    }).then(() => {
      load(); setSelected(null); setDecision({ status:'refund_approved', note:'' });
    }).finally(() => setSubmitting(false));
  };

  const openCount = disputes.filter(d => d.status === 'open').length;

  return (
    <div style={A.page} className="fade-in">
      <PageHeader title="Dispute Center" subtitle="Arbitrasi dan penyelesaian sengketa transaksi platform.">
        <button style={A.btnGhost} onClick={load}><i className="bx bx-refresh" /> Refresh</button>
      </PageHeader>

      <StatRow stats={[
        { label:'Total Sengketa', val:disputes.length, icon:'bxs-error-circle', color:'#6366f1' },
        { label:'Terbuka', val:openCount, icon:'bxs-error', color:'#dc2626' },
        { label:'Selesai', val:disputes.filter(d=>d.status!=='open').length, icon:'bxs-check-circle', color:'#10b981' },
      ]} />

      {openCount > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 20px', background:'#fff1f2', borderRadius:14, border:'1px solid #fecdd3' }}>
          <div style={{ width:40, height:40, borderRadius:11, background:'#fee2e2', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <i className="bx bxs-error" style={{ fontSize:20, color:'#dc2626' }} />
          </div>
          <div>
            <div style={{ fontSize:13.5, fontWeight:800, color:'#9f1239' }}>{openCount} Sengketa Memerlukan Arbitrasi</div>
            <div style={{ fontSize:12, color:'#be123c' }}>Tindakan admin diperlukan segera.</div>
          </div>
        </div>
      )}

      <TablePanel loading={loading}>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:700 }}>
          <thead>
            <tr>
              {['Order ID','Alasan','Pembeli','Status','Tanggal','Aksi'].map((h,i)=>(
                <th key={h} style={{ ...A.th, textAlign:i===5?'right':'left', paddingLeft:i===0?24:16, paddingRight:i===5?24:16 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {disputes.length === 0 ? (
              <tr><td colSpan={6} style={{ padding:'64px', textAlign:'center', color:'#94a3b8' }}>
                <i className="bx bxs-check-shield" style={{ fontSize:48, display:'block', marginBottom:12, opacity:0.2, color:'#10b981' }} />
                <div style={{ fontWeight:700, fontSize:15, color:'#475569', marginBottom:4 }}>Tidak ada sengketa</div>
                <div style={{ fontSize:13 }}>Semua transaksi berjalan lancar.</div>
              </td></tr>
            ) : disputes.map((d, idx) => (
              <tr key={d.id}
                style={{ background:idx%2===0?'#fff':'#fafafa' }}
                onMouseEnter={e=>e.currentTarget.style.background='#fff5f5'}
                onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?'#fff':'#fafafa'}
              >
                <td style={{ ...A.td, paddingLeft:24 }}>
                  <span style={{ fontFamily:'monospace', fontWeight:800, color:'#6366f1', fontSize:14 }}>#{d.order_id?.slice(0,8).toUpperCase()}</span>
                </td>
                <td style={{ ...A.td, maxWidth:200 }}>
                  <span style={{ fontSize:13.5, fontWeight:600, color:'#0f172a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'block' }}>{d.reason}</span>
                </td>
                <td style={A.td}>
                  <span style={{ fontFamily:'monospace', fontSize:12, color:'#64748b' }}>#{d.buyer_id?.slice(0,8)}</span>
                </td>
                <td style={A.td}><DSpan status={d.status} /></td>
                <td style={A.td}><span style={{ fontSize:13 }}>{new Date(d.created_at).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'})}</span></td>
                <td style={{ ...A.td, paddingRight:24, textAlign:'right' }}>
                  {d.status === 'open' ? (
                    <button
                      onClick={() => setSelected(d)}
                      style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:11, border:'none', background:'#fff1f2', color:'#dc2626', fontSize:12.5, fontWeight:700, cursor:'pointer' }}
                    >
                      <i className="bx bx-gavel" style={{ fontSize:15 }} /> Arbitrasi
                    </button>
                  ) : (
                    <span style={{ fontSize:12, color:'#94a3b8', fontStyle:'italic' }}>Selesai</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TablePanel>

      {selected && (
        <Modal title="Panel Arbitrasi" onClose={() => setSelected(null)}>
          <div style={{ background:'#f8fafc', borderRadius:12, padding:'14px 16px', marginBottom:20, borderLeft:'3px solid #dc2626' }}>
            <div style={{ fontSize:10, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Alasan Sengketa</div>
            <div style={{ fontSize:14, color:'#334155', fontWeight:600 }}>{selected.reason}</div>
            <div style={{ fontSize:11, color:'#94a3b8', marginTop:6, fontFamily:'monospace' }}>Order #{selected.order_id?.slice(0,8).toUpperCase()}</div>
          </div>

          <div style={{ marginBottom:16 }}>
            <FieldLabel>Keputusan Arbitrasi</FieldLabel>
            <select style={{ ...A.select, width:'100%' }} value={decision.status} onChange={e=>setDecision({...decision,status:e.target.value})}>
              <option value="refund_approved">✅ Setujui Refund — Uang kembali ke pembeli</option>
              <option value="rejected">❌ Tolak Refund — Uang diteruskan ke penjual</option>
              <option value="pending">⏳ Minta Bukti Tambahan</option>
            </select>
          </div>

          <div style={{ marginBottom:16 }}>
            <FieldLabel>Catatan Keputusan (Wajib)</FieldLabel>
            <textarea
              style={{ ...A.textarea, minHeight:90 }}
              placeholder="Jelaskan alasan keputusan berdasarkan kebijakan platform..."
              value={decision.note}
              onChange={e=>setDecision({...decision,note:e.target.value})}
            />
          </div>

          <div style={{ padding:'12px 16px', background:'#fffbeb', borderRadius:11, border:'1px solid #fde68a', fontSize:12.5, color:'#92400e', display:'flex', gap:8, marginBottom:20 }}>
            <i className="bx bxs-info-circle" style={{ flexShrink:0, fontSize:16, marginTop:1 }} />
            Keputusan arbitrasi bersifat final dan langsung mempengaruhi saldo wallet pihak terkait.
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <button style={A.btnGhost} onClick={()=>setSelected(null)}>Batal</button>
            <button
              onClick={arbitrate}
              disabled={!decision.note.trim() || submitting}
              style={{ ...A.btnPrimary, background:'linear-gradient(135deg,#dc2626,#b91c1c)', justifyContent:'center', padding:'11px', opacity:decision.note.trim()?1:0.6 }}
            >
              {submitting ? '...' : <><i className="bx bx-gavel" /> Kirim Keputusan</>}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
