import React, { useState, useEffect } from 'react';
import { fetchJson, MERCHANT_API_BASE } from '../../lib/api';
import { PageHeader, StatRow, TablePanel, Modal, FieldLabel, A, statusBadge, idr, fmtDate } from '../../lib/adminStyles.jsx';

export default function MerchantWallet() {
  const [wallet, setWallet] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawNote, setWithdrawNote] = useState('');
  const [requesting, setRequesting] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetchJson(`${MERCHANT_API_BASE}/wallet`),
      fetchJson(`${MERCHANT_API_BASE}/wallet/history`)
    ]).then(([w, h]) => {
      setWallet(w?.data || w);
      setHistory(Array.isArray(h?.data) ? h.data : (Array.isArray(h) ? h : []));
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleWithdraw = async () => {
    if (Number(withdrawAmount) > wallet?.available_balance) {
      alert("Saldo tidak mencukupi untuk nominal penarikan ini.");
      return;
    }
    setRequesting(true);
    try {
      await fetchJson(`${MERCHANT_API_BASE}/wallet/withdraw`, {
        method: 'POST',
        body: JSON.stringify({ amount: Number(withdrawAmount), note: withdrawNote })
      });
      setShowPayoutModal(false);
      setWithdrawAmount('');
      setWithdrawNote('');
      loadData();
    } catch (err) {
      alert("Gagal melakukan penarikan: " + err.message);
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div style={A.page} className="fade-in">
      <PageHeader title="Corporate Finance & Wallet" subtitle="Sistem kendali aset liquid dan escrow. Pencairan real-time ke rekening master.">
        <button style={A.btnPrimary} onClick={() => setShowPayoutModal(true)}>
          <i className="bx bx-money-withdraw" /> Ajukan Penarikan
        </button>
      </PageHeader>

      {/* KPI Cards */}
      <StatRow stats={[
        { label: 'Available Liquidity', val: loading ? '...' : idr(wallet?.available_balance), icon: 'bx-wallet-alt', color: '#10b981' },
        { label: 'Escrow (Pending)', val: loading ? '...' : idr(wallet?.pending_balance), icon: 'bxs-lock-alt', color: '#f59e0b' },
        { label: 'All-time Earned', val: loading ? '...' : idr(wallet?.total_sales), icon: 'bxs-bank', color: '#6366f1' },
        { label: 'Service Fee Rate', val: loading ? '...' : `${wallet?.service_fee || 5}%`, icon: 'bx-shield-quarter', color: '#8b5cf6' },
      ]} />

      {/* Helper Banner */}
      <div style={{ display:'flex', alignItems:'center', gap:16, padding:'16px 20px', background:'#f8fafc', borderRadius:14, border:'1px solid #f1f5f9' }}>
        <div style={{ width:40, height:40, borderRadius:10, background:'#eef2ff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
           <i className="bx bxs-shield-check" style={{ fontSize:20, color:'#6366f1' }} />
        </div>
        <div>
           <div style={{ fontWeight:800, color:'#0f172a', fontSize:13 }}>Atomic Ledger Integration aktif</div>
           <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>Escrow dana dilepaskan ke dompet cair secara seketika saat pesanan selesai. Dana Anda terlindungi oleh sistem enkripsi tingkat militer.</div>
        </div>
      </div>

      <div style={{ ...A.card, padding: '24px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div style={{ fontSize:15, fontWeight:800, color:'#0f172a' }}>Riwayat Penarikan Dana</div>
          <button style={A.btnGhost} onClick={loadData}>
            <i className="bx bx-refresh" /> Refresh
          </button>
        </div>
        <TablePanel loading={loading}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
            <thead>
              <tr>
                <th style={{ ...A.th, paddingLeft: 24, textAlign: 'left' }}>REQUEST DATE</th>
                <th style={{ ...A.th, textAlign: 'left' }}>REFERENCE ID</th>
                <th style={{ ...A.th, textAlign: 'left' }}>AMOUNT</th>
                <th style={{ ...A.th, textAlign: 'left' }}>STATUS</th>
                <th style={{ ...A.th, paddingRight: 24, textAlign: 'right' }}>REMARKS</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>Belum ada log pencairan dana.</td></tr>
              ) : history.map((h, i) => (
                <tr key={h?.id || i} style={{ borderBottom: i === history.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                  <td style={{ ...A.td, paddingLeft: 24 }}>
                    <div style={{ fontWeight: 800, color: '#0f172a' }}>{h?.requested_at ? fmtDate(h.requested_at) : '—'}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{h?.requested_at ? new Date(h.requested_at).toLocaleTimeString('id-ID') : '—'}</div>
                  </td>
                  <td style={A.td}>
                    <code style={{ fontSize:11, fontFamily:'monospace', color:'#64748b', background:'#f8fafc', padding:'3px 8px', borderRadius:6 }}>
                      {h?.id ? h.id.split('-')[0].toUpperCase() : 'TRX-ERR'}
                    </code>
                  </td>
                  <td style={A.td}>
                    <span style={{ fontWeight: 800, color: '#10b981' }}>{idr(h?.amount)}</span>
                  </td>
                  <td style={A.td}>
                    {h?.status === 'paid' || h?.status === 'approved' ? (
                       <span style={{ display:'inline-flex', padding:'4px 12px', borderRadius:20, background:'#ecfdf5', color:'#10b981', fontSize:11, fontWeight:800 }}>COMPLETED</span>
                    ) : h?.status === 'rejected' ? (
                       <span style={{ display:'inline-flex', padding:'4px 12px', borderRadius:20, background:'#fef2f2', color:'#ef4444', fontSize:11, fontWeight:800 }}>REJECTED</span>
                    ) : (
                       <span style={{ display:'inline-flex', padding:'4px 12px', borderRadius:20, background:'#fffbeb', color:'#f59e0b', fontSize:11, fontWeight:800 }}>PENDING</span>
                    )}
                  </td>
                  <td style={{ ...A.td, paddingRight: 24, textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: '#64748b', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block' }}>
                      {h?.note || '-'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TablePanel>
      </div>

      {showPayoutModal && (
        <Modal title="Formulir Penarikan Agresif" onClose={() => setShowPayoutModal(false)}>
           <div style={{ padding: '0 24px 24px' }}>
              <div style={{ background:'#f8fafc', padding:16, borderRadius:12, marginBottom:20, border:'1px solid #f1f5f9' }}>
                 <div style={{ fontSize:11, color:'#64748b', fontWeight:700, textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>Saldo Maksimal Bisa Ditarik</div>
                 <div style={{ fontSize:24, fontWeight:800, color:'#10b981' }}>{wallet ? idr(wallet.available_balance) : '...'}</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                 <div>
                    <FieldLabel>Nominal Penarikan (IDR)</FieldLabel>
                    <input 
                      type="number" 
                      style={A.input} 
                      placeholder="Contoh: 150000"
                      value={withdrawAmount}
                      onChange={e => setWithdrawAmount(e.target.value)}
                    />
                 </div>
                 <div>
                    <FieldLabel>Catatan (Opsional)</FieldLabel>
                    <textarea 
                      style={{ ...A.input, minHeight: 80, resize: 'none' }} 
                      placeholder="Nomor rekening tujuan, nama bank, dsb..."
                      value={withdrawNote}
                      onChange={e => setWithdrawNote(e.target.value)}
                    />
                 </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 30 }}>
                 <button style={A.btnGhost} onClick={() => setShowPayoutModal(false)}>Batal</button>
                 <button style={A.btnPrimary} onClick={handleWithdraw} disabled={requesting || !withdrawAmount}>
                    {requesting ? 'Memproses...' : 'Tarik Dana Sekarang'}
                 </button>
              </div>
           </div>
        </Modal>
      )}
    </div>
  );
}
