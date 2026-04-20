import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';
import { PageHeader, StatRow, TablePanel, Modal, FieldLabel, statusBadge, idr, fmtDate, A } from '../../lib/adminStyles.jsx';

const API = ADMIN_API_BASE;

export default function AdminMerchants() {
  const [merchants, setMerchants] = useState([]);
  const [stats, setStats] = useState({});
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [note, setNote] = useState('');
  
  // Commission override state
  const [commission, setCommission] = useState({ fee_percent: 0, loading: false });

  const load = () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (filter) p.append('status', filter);
    if (search) p.append('search', search);
    Promise.all([
      fetchJson(`${API}/merchants?${p}`),
      fetchJson(`${API}/merchants/stats`),
    ]).then(([list, s]) => {
      const data = Array.isArray(list) ? list : (list.data || []);
      setMerchants(data);
      setStats(s || {});
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  const loadCommission = (merchantId) => {
    setCommission({ ...commission, loading: true });
    fetchJson(`${API}/merchants/commissions?merchant_id=${merchantId}`)
      .then(res => {
         const list = Array.isArray(res) ? res : (res.data || []);
         const data = list.length > 0 ? list[0] : { fee_percent: 0.05 }; // Default 5%
         setCommission({ fee_percent: data.fee_percent * 100, loading: false, id: data.id });
      })
      .catch(() => setCommission({ fee_percent: 5, loading: false }));
  };

  const saveCommission = () => {
     if (!modal) return;
     setCommission({ ...commission, loading: true });
     fetchJson(`${API}/merchants/commissions`, {
        method: 'POST',
        body: JSON.stringify({
           id: commission.id || undefined,
           merchant_id: modal.id,
           fee_percent: parseFloat(commission.fee_percent) / 100
        })
     }).then(() => {
        alert('Merchant specific commission rate updated successfully.');
        setCommission({ ...commission, loading: false });
     }).catch(err => {
        alert(err.message);
        setCommission({ ...commission, loading: false });
     });
  };

  const updateStatus = (id, status) => {
    fetchJson(`${API}/merchants/status`, {
      method: 'PUT',
      body: JSON.stringify({ merchant_id: id, status, suspend_note: note }),
    }).then(() => { load(); setModal(null); setNote(''); });
  };

  const toggleVerify = (id, current) => {
    fetchJson(`${API}/merchants/verify`, {
      method: 'PUT',
      body: JSON.stringify({ merchant_id: id, verified: !current }),
    }).then(() => {
      if (modal) setModal({ ...modal, is_verified: !current });
      load();
    });
  };

  return (
    <div style={A.page} className="fade-in">
      <PageHeader title="Empire Merchants & Tenants" subtitle="Pusat kendali mitra bisnis. Kelola verifikasi, batasan operasional, dan kesepakatan komisi khusus.">
        <div style={A.searchWrap}>
          <i className="bx bx-search" style={A.searchIcon} />
          <input
            style={A.searchInput}
            placeholder="Search tenant name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
          />
        </div>
        <button style={A.btnGhost} onClick={load}><i className={`bx bx-refresh ${loading?'bx-spin':''}`} /></button>
      </PageHeader>

      <StatRow stats={[
        { label: 'Active Tenants', val: stats.active || 0, icon: 'bx-store', color: '#10b981' },
        { label: 'Pending Approval', val: stats.pending || 0, icon: 'bx-time-five', color: '#f59e0b' },
        { label: 'Suspended Entities', val: stats.suspended || 0, icon: 'bx-block', color: '#ef4444' },
      ]} />

      <TablePanel
        loading={loading}
        tabs={[
          { val: '', label: 'Full Spectrum' },
          { val: 'active', label: 'Operational' },
          { val: 'pending', label: 'Verification Queue' },
          { val: 'suspended', label: 'Sanctioned' },
        ].map(t => (
          <button key={t.val} style={A.tab(filter === t.val)} onClick={() => setFilter(t.val)}>{t.label}</button>
        ))}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
          <thead>
            <tr>
              {['Store Entity', 'Oper. Status', 'Legal ID', 'Capital Flow', 'Timeline', 'Actions'].map((h, i) => (
                <th key={h} style={{ ...A.th, textAlign: i === 5 ? 'right' : 'left', paddingLeft: i === 0 ? 24 : 16, paddingRight: i === 5 ? 24 : 16 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {merchants.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '80px 20px', textAlign: 'center', color: '#94a3b8' }}>
                <i className="bx bx-store-alt" style={{ fontSize: 60, display: 'block', marginBottom: 16, opacity: 0.1 }} />
                <div style={{ fontWeight: 800 }}>No entities detected in this sector.</div>
              </td></tr>
            ) : merchants.map((m, idx) => (
              <tr key={m.id}
                style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f5f7ff'}
                onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa'}
              >
                <td style={{ ...A.td, paddingLeft: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #e2e8f0' }}>
                      <i className="bx bxs-store-alt" style={{ color: '#4f46e5', fontSize: 20 }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 14.5 }}>{m.store_name}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>TENANT-ID: {m.id?.slice(0, 12)}</div>
                    </div>
                  </div>
                </td>
                <td style={A.td}><div style={statusBadge(m.status)}>{m.status?.toUpperCase()}</div></td>
                <td style={A.td}>
                  <div style={{ ...statusBadge(m.is_verified ? 'verified' : 'draft'), borderRadius: 8, padding: '6px 10px', fontSize: 10 }}>
                    <i className={`bx ${m.is_verified ? 'bxs-badge-check' : 'bx-badge'}`} style={{ fontSize: 14 }} />
                    {m.is_verified ? 'LEGALLY VERIFIED' : 'PENDING DOCS'}
                  </div>
                </td>
                <td style={A.td}>
                  <div style={{ fontWeight: 900, color: '#0f172a', fontSize: 15, letterSpacing: '-0.02em' }}>{idr(m.balance)}</div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Revenue: {idr(m.total_sales)}</div>
                </td>
                <td style={A.td}><span style={{ fontSize: 12.5, fontWeight: 500 }}>{fmtDate(m.joined_at)}</span></td>
                <td style={{ ...A.td, paddingRight: 24, textAlign: 'right' }}>
                  <button
                    style={A.iconBtn('#4f46e5', '#f0f4ff')}
                    onClick={() => { setModal(m); setNote(''); loadCommission(m.id); }}
                    title="Control Entity"
                  >
                    <i className="bx bx-cog" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TablePanel>

      {modal && (
        <Modal title={modal.store_name} onClose={() => setModal(null)} wide>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Asset Valuation', val: idr(modal.total_sales), icon: 'bx-trending-up', color: '#10b981' },
              { label: 'Available Capital', val: idr(modal.balance), icon: 'bx-wallet', color: '#4f46e5' },
              { label: 'Platform Tenure', val: fmtDate(modal.joined_at), icon: 'bx-calendar', color: '#64748b' },
            ].map(s => (
              <div key={s.label} style={{ background: '#f8fafc', borderRadius: 16, padding: '20px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <i className={s.icon} style={{ fontSize: 24, color: s.color, marginBottom: 12, display: 'block' }} />
                <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>{s.val}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, marginBottom: 24 }}>
            <div style={{ ...A.card, padding: 24, border: '1px solid #f1f5f9' }}>
               <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 20 }}>Operational Controls</h4>
               
               <div style={{ marginBottom: 20 }}>
                  <FieldLabel>Merchant Specific Service Fee (%)</FieldLabel>
                  <div style={{ display: 'flex', gap: 10 }}>
                     <input 
                        type="number" 
                        value={commission.fee_percent}
                        onChange={e => setCommission({ ...commission, fee_percent: e.target.value })}
                        style={{ ...A.input, fontWeight: 800, fontSize: 18, padding: '12px 16px', flex: 1 }}
                        placeholder="e.g. 5.0"
                     />
                     <button 
                        onClick={saveCommission}
                        disabled={commission.loading}
                        style={{ ...A.btnPrimary, flexShrink: 0, padding: '0 24px' }}
                     >
                        {commission.loading ? '...' : 'Apply'}
                     </button>
                  </div>
                  <p style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>This rate overrides the global platform category commission for this specific merchant.</p>
               </div>

               <div style={{ marginBottom: 20 }}>
                  <FieldLabel>Official Verification Seal</FieldLabel>
                  <button
                    onClick={() => toggleVerify(modal.id, modal.is_verified)}
                    style={{ ...A.btnPrimary, background: modal.is_verified ? 'linear-gradient(135deg,#64748b,#475569)' : 'linear-gradient(135deg,#10b981,#059669)', width: '100%', justifyContent: 'center', padding: '12px', fontSize: 13 }}
                  >
                    <i className={`bx ${modal.is_verified ? 'bxs-badge-check' : 'bx-badge'}`} />
                    {modal.is_verified ? 'REVOKE VERIFICATION' : 'GRANT VERIFICATION SEAL'}
                  </button>
               </div>
            </div>

            <div style={{ ...A.card, padding: 24, border: '1px solid #f1f5f9' }}>
               <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 20 }}>Security Actions</h4>
               
               <div style={{ marginBottom: 20 }}>
                  <FieldLabel>Entity Status Assignment</FieldLabel>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
                    {['active', 'pending', 'suspended'].map(s => (
                      <button key={s}
                        onClick={() => updateStatus(modal.id, s)}
                        style={{
                          padding: '10px', borderRadius: 12, border: '1px solid #e2e8f0', cursor: 'pointer',
                          fontWeight: 800, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.5,
                          background: modal.status === s
                            ? (s === 'active' ? '#10b981' : s === 'pending' ? '#f59e0b' : '#ef4444')
                            : '#fff',
                          color: modal.status === s ? '#fff' : '#64748b',
                          transition: 'all 0.15s',
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <textarea
                    style={{ ...A.textarea, minHeight: 100, fontSize: 13 }}
                    placeholder="Enter judicial reasoning for suspension or operational restriction..."
                    value={note}
                    onChange={e => setNote(e.target.value)}
                  />
               </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
