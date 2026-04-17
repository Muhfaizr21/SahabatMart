import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';
import { PageHeader, StatRow, TablePanel, Modal, FieldLabel, statusBadge, idr, fmtDate, A } from '../../lib/adminStyles.jsx';

const API = ADMIN_API_BASE;

const PAYOUT_STATUS = {
  pending:  { color: '#d97706', bg: '#fffbeb' },
  approved: { color: '#2563eb', bg: '#eff6ff' },
  paid:     { color: '#16a34a', bg: '#f0fdf4' },
  rejected: { color: '#dc2626', bg: '#fff1f2' },
};

const PayBadge = ({ status }) => {
  const s = PAYOUT_STATUS[status] || { color: '#64748b', bg: '#f1f5f9' };
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:20, background:s.bg, color:s.color, fontSize:11, fontWeight:700 }}>
      {status}
    </span>
  );
};

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

  const process = (status) => {
    if (!selected) return;
    setProcessing(true);
    fetch(`${API}/payouts/process`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payout_id: selected.id, status, note, processed_by: 'admin' }),
    }).then(() => {
      setToast(`Payout berhasil ${status === 'paid' ? 'dibayar' : status === 'approved' ? 'disetujui' : 'ditolak'}`);
      setTimeout(() => setToast(''), 3000);
      setSelected(null); setNote(''); load();
    }).finally(() => setProcessing(false));
  };

  const pending = payouts.filter(p => p.status === 'pending');
  const totalPending = pending.reduce((s,p) => s + (p.amount||0), 0);

  const TABS = [
    { val: '', label: 'Semua' },
    { val: 'pending', label: 'Pending' },
    { val: 'approved', label: 'Approved' },
    { val: 'paid', label: 'Dibayar' },
    { val: 'rejected', label: 'Ditolak' },
  ];

  return (
    <div style={A.page} className="fade-in">
      <PageHeader title="Payout Operations" subtitle="Proses pencairan saldo merchant secara aman dan teraudit.">
        <button style={A.btnGhost} onClick={load}><i className="bx bx-refresh" /> Refresh</button>
      </PageHeader>

      <StatRow stats={[
        { label: 'Total Request', val: payouts.length, icon: 'bxs-wallet', color: '#6366f1' },
        { label: 'Pending', val: pending.length, icon: 'bxs-hourglass', color: '#f59e0b' },
        { label: 'Nominal Pending', val: idr(totalPending), icon: 'bxs-dollar-circle', color: '#ef4444' },
        { label: 'Dibayar', val: payouts.filter(p=>p.status==='paid').length, icon: 'bxs-check-circle', color: '#10b981' },
      ]} />

      {toast && (
        <div style={{ padding:'12px 20px', borderRadius:12, background:'#f0fdf4', border:'1px solid #bbf7d0', color:'#15803d', fontWeight:700, fontSize:13, display:'flex', alignItems:'center', gap:8 }}>
          <i className="bx bx-check-circle" style={{ fontSize:18 }} /> {toast}
        </div>
      )}

      <TablePanel
        loading={loading}
        tabs={TABS.map(t => <button key={t.val} style={A.tab(tab===t.val)} onClick={()=>setTab(t.val)}>{t.label}</button>)}
      >
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:700 }}>
          <thead>
            <tr>
              {['ID Payout','Merchant','Nominal','Status','Catatan','Tgl Request','Aksi'].map((h,i)=>(
                <th key={h} style={{ ...A.th, textAlign:i===6?'right':'left', paddingLeft:i===0?24:16, paddingRight:i===6?24:16 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payouts.length === 0 ? (
              <tr><td colSpan={7} style={{ padding:'60px 20px', textAlign:'center', color:'#94a3b8' }}>
                <i className="bx bx-wallet" style={{ fontSize:40, display:'block', marginBottom:8, opacity:0.3 }} />
                Tidak ada payout ditemukan.
              </td></tr>
            ) : payouts.map((p, idx) => (
              <tr key={p.id}
                style={{ background: idx%2===0?'#fff':'#fafafa' }}
                onMouseEnter={e=>e.currentTarget.style.background='#f5f7ff'}
                onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?'#fff':'#fafafa'}
              >
                <td style={{ ...A.td, paddingLeft:24 }}>
                  <span style={{ fontFamily:'monospace', fontSize:13, fontWeight:700, color:'#0f172a' }}>#{p.id?.slice(0,8).toUpperCase()}</span>
                </td>
                <td style={A.td}>
                  <span style={{ fontFamily:'monospace', fontSize:12, color:'#64748b' }}>{p.merchant_id?.slice(0,8)}…</span>
                </td>
                <td style={A.td}>
                  <span style={{ fontWeight:800, color:'#0f172a', fontSize:15 }}>{idr(p.amount)}</span>
                </td>
                <td style={A.td}><PayBadge status={p.status} /></td>
                <td style={{ ...A.td, maxWidth:160 }}>
                  <span style={{ fontSize:12, color:'#64748b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'block' }}>{p.note||'—'}</span>
                </td>
                <td style={A.td}><span style={{ fontSize:13 }}>{fmtDate(p.requested_at)}</span></td>
                <td style={{ ...A.td, paddingRight:24, textAlign:'right' }}>
                  {(p.status === 'pending' || p.status === 'approved') && (
                    <button style={A.iconBtn('#6366f1','#eef2ff')} onClick={()=>{setSelected(p);setNote('');}} title="Proses">
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
        <Modal title="Proses Payout" onClose={()=>setSelected(null)}>
          <div style={{ background:'#f8fafc', borderRadius:12, padding:'16px 20px', marginBottom:20, display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ ...A.iconBox('#10b981'), width:48, height:48, borderRadius:14 }}>
              <i className="bx bxs-wallet" style={{ fontSize:22, color:'#10b981' }} />
            </div>
            <div>
              <div style={{ fontSize:11, color:'#94a3b8', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:3 }}>Nominal Payout</div>
              <div style={{ fontSize:24, fontWeight:900, color:'#0f172a', letterSpacing:'-0.04em' }}>{idr(selected.amount)}</div>
              <div style={{ fontSize:11, color:'#94a3b8', fontFamily:'monospace', marginTop:2 }}>Merchant ID: {selected.merchant_id?.slice(0,16)}</div>
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <FieldLabel>Catatan Proses</FieldLabel>
            <textarea
              style={{ ...A.textarea, minHeight:80 }}
              placeholder="Misal: Ditransfer via BCA 123***"
              value={note}
              onChange={e=>setNote(e.target.value)}
            />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
            <button onClick={()=>setSelected(null)} style={{ padding:'11px', borderRadius:11, border:'1px solid #e2e8f0', background:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', color:'#64748b' }}>
              Batal
            </button>
            <button
              onClick={()=>process('rejected')}
              disabled={processing}
              style={{ padding:'11px', borderRadius:11, border:'none', background:'#fff1f2', color:'#dc2626', fontWeight:700, fontSize:13, cursor:'pointer' }}
            >
              <i className="bx bx-x-circle" /> Tolak
            </button>
            <button
              onClick={()=>process('paid')}
              disabled={processing}
              style={{ ...A.btnPrimary, background:'linear-gradient(135deg,#10b981,#059669)', justifyContent:'center', padding:'11px' }}
            >
              {processing ? '...' : <><i className="bx bx-check-double" /> Bayar</>}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
