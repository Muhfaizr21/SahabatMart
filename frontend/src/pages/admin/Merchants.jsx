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
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  // Commission override state
  const [commission, setCommission] = useState({ fee_percent: 0, loading: false });
  const [areas, setAreas] = useState([]);
  const [searchingArea, setSearchingArea] = useState(false);
  const [logisticChannels, setLogisticChannels] = useState([]);

  const loadLogistics = () => {
    fetchJson(`${API}/logistics`)
      .then(res => {
        const data = Array.isArray(res) ? res : (res.data || []);
        setLogisticChannels(data);
      })
      .catch(console.error);
  };

  // Handle window resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  useEffect(() => { load(); loadLogistics(); }, [filter]);

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
      load();
    });
  };

  const handleSearchArea = async (input) => {
    if (input.length < 3) return;
    setSearchingArea(true);
    try {
      const res = await fetchJson(`/api/shipping/areas?input=${input}`);
      setAreas(res.areas || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingArea(true);
      setTimeout(() => setSearchingArea(false), 500);
    }
  };

  const updateMerchantArea = (area) => {
    if (!modal) return;
    fetchJson(`${API}/merchants/update`, {
      method: 'PUT',
      body: JSON.stringify({ 
        merchant_id: modal.id, 
        biteship_area_id: area.id,
        is_verified: modal.is_verified 
      }),
    }).then(() => {
      setModal({ ...modal, biteship_area_id: area.id });
      setAreas([]);
      load();
    }).catch(alert);
  };

  const toggleCourier = (code) => {
    if (!modal) return;
    let current = modal.enabled_couriers ? modal.enabled_couriers.split(',').filter(Boolean) : [];
    if (current.includes(code)) {
        current = current.filter(c => c !== code);
    } else {
        current.push(code);
    }
    const newList = current.join(',');
    
    fetchJson(`${API}/merchants/update`, {
      method: 'PUT',
      body: JSON.stringify({ 
        merchant_id: modal.id, 
        enabled_couriers: newList,
        is_verified: modal.is_verified 
      }),
    }).then(() => {
      setModal({ ...modal, enabled_couriers: newList });
      load();
    }).catch(alert);
  };

  const isMobile = windowWidth < 640;
  const isTablet = windowWidth < 1024;

  return (
    <div style={A.page} className="fade-in">
      <PageHeader title="Empire Merchants & Tenants" subtitle="Pusat kendali mitra bisnis. Kelola verifikasi, batasan operasional, dan kesepakatan komisi khusus.">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, width: '100%' }}>
          <div style={{ ...A.searchWrap, minWidth: 0, flex: 1, minWidth: isMobile ? '100%' : 250 }}>
            <i className="bx bx-search" style={A.searchIcon} />
            <input
              style={A.searchInput}
              placeholder="Search tenant name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && load()}
            />
          </div>
          <button style={{ ...A.btnGhost, flex: '0 0 auto' }} onClick={load}><i className={`bx bx-refresh ${loading ? 'bx-spin' : ''}`} /></button>
        </div>
      </PageHeader>

      <StatRow stats={[
        { label: 'Active Tenants', val: stats.active || 0, icon: 'bx-store', color: '#10b981' },
        { label: 'Pending Approval', val: stats.pending || 0, icon: 'bx-time-five', color: '#f59e0b' },
        { label: 'Suspended Entities', val: stats.suspended || 0, icon: 'bx-block', color: '#ef4444' },
      ]} />

      <TablePanel
        loading={loading}
        tabs={
          <div style={{ display: 'flex', overflowX: 'auto', gap: 10, paddingBottom: 4, scrollBehavior: 'smooth' }}>
            {[
              { val: '', label: 'Full Spectrum' },
              { val: 'active', label: 'Operational' },
              { val: 'pending', label: 'Verification Queue' },
              { val: 'suspended', label: 'Sanctioned' },
            ].map(t => (
              <button key={t.val} style={{ ...A.tab(filter === t.val), whiteSpace: 'nowrap', fontSize: isMobile ? 12 : 14 }} onClick={() => setFilter(t.val)}>{t.label}</button>
            ))}
          </div>
        }
      >
        {/* Desktop Table View */}
        {!isMobile ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
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
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: m.logo_url ? `url(${m.logo_url})` : 'linear-gradient(135deg, #4f46e5, #7c3aed)', backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #e2e8f0' }}>
                        {!m.logo_url && <i className="bx bxs-store-alt" style={{ color: '#fff', fontSize: 20 }} />}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 14.5 }}>{m.store_name}</div>
                        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>TENANT-ID: {m.id?.slice(0, 8)} | {m.slug}</div>
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
                  <td style={A.td}>
                    <span style={{ fontSize: 12.5, fontWeight: 500 }}>{m.joined_at && !m.joined_at.startsWith('0001') ? fmtDate(m.joined_at) : 'Awaiting sync'}</span>
                  </td>
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
        ) : (
          // Mobile Card View
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 0' }}>
            {merchants.length === 0 ? (
              <div style={{ padding: '80px 20px', textAlign: 'center', color: '#94a3b8' }}>
                <i className="bx bx-store-alt" style={{ fontSize: 60, display: 'block', marginBottom: 16, opacity: 0.1 }} />
                <div style={{ fontWeight: 800 }}>No entities detected in this sector.</div>
              </div>
            ) : merchants.map((m) => (
              <div key={m.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: m.logo_url ? `url(${m.logo_url})` : 'linear-gradient(135deg, #4f46e5, #7c3aed)', backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #e2e8f0' }}>
                    {!m.logo_url && <i className="bx bxs-store-alt" style={{ color: '#fff', fontSize: 20 }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 14, marginBottom: 4 }}>{m.store_name}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', wordBreak: 'break-word' }}>ID: {m.id?.slice(0, 8)}</div>
                  </div>
                  <button
                    style={A.iconBtn('#4f46e5', '#f0f4ff')}
                    onClick={() => { setModal(m); setNote(''); loadCommission(m.id); }}
                    title="Control Entity"
                  >
                    <i className="bx bx-cog" />
                  </button>
                </div>

                {/* Status Badges */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  <div style={statusBadge(m.status)}>{m.status?.toUpperCase()}</div>
                  <div style={{ ...statusBadge(m.is_verified ? 'verified' : 'draft'), borderRadius: 8, padding: '6px 10px', fontSize: 10 }}>
                    <i className={`bx ${m.is_verified ? 'bxs-badge-check' : 'bx-badge'}`} style={{ fontSize: 14 }} />
                    {m.is_verified ? 'VERIFIED' : 'PENDING'}
                  </div>
                </div>

                {/* Info Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, marginBottom: 4 }}>BALANCE</div>
                    <div style={{ fontWeight: 900, color: '#0f172a', fontSize: 14 }}>{idr(m.balance)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, marginBottom: 4 }}>REVENUE</div>
                    <div style={{ fontWeight: 900, color: '#0f172a', fontSize: 14 }}>{idr(m.total_sales)}</div>
                  </div>
                </div>

                {/* Timeline */}
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>
                    {m.joined_at && !m.joined_at.startsWith('0001') ? fmtDate(m.joined_at) : 'Awaiting sync'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </TablePanel>

      {modal && (
        <Modal title="Merchant Governance Panel" onClose={() => setModal(null)} wide>
          {/* Safety Buffer for Header Clipping */}
          <div style={{ height: 4 }} /> 
          
          {/* Identity Card (User-style) with Safe Margin */}
          <div style={{ display: 'flex', marginTop: 12, alignItems: 'center', gap: 20, marginBottom: 24, padding: 20, background: '#f8fafc', borderRadius: 16, border: '1px solid #f1f5f9', position: 'relative' }}>
            <div style={{ 
              width: 60, height: 60, borderRadius: 14, flexShrink: 0,
              background: modal.logo_url ? `url(${modal.logo_url})` : 'linear-gradient(135deg, #4f46e5, #7c3aed)', 
              backgroundSize: 'cover', backgroundPosition: 'center',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid #fff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}>
              {!modal.logo_url && <i className="bx bxs-store-alt" style={{ color: '#fff', fontSize: 24 }} />}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 16, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{modal.store_name}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 6 }}>TENANT-ID: <span style={{ color: '#4f46e5' }}>{modal.id?.slice(0, 16)}...</span></div>
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={{ ...statusBadge(modal.status), fontSize: 10, padding: '3px 8px' }}>{modal.status?.toUpperCase()}</span>
                {modal.is_verified && <span style={{ ...statusBadge('verified'), fontSize: 10, padding: '3px 8px' }}><i className="bx bxs-badge-check" /> VERIFIED</span>}
              </div>
            </div>
          </div>

          {/* Stats Summary (Simplified) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Evaluation', val: idr(modal.total_sales), color: '#10b981' },
              { label: 'Capital', val: idr(modal.balance), color: '#4f46e5' },
              { label: 'Tenure', val: modal.joined_at && !modal.joined_at.startsWith('0001') ? fmtDate(modal.joined_at) : 'New Mitra', color: '#64748b' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', padding: '12px 8px', borderRadius: 12, border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 12, fontWeight: 900, color: s.color }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Operational Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20, marginBottom: 24 }}>
            {/* Status & Reasoning */}
            <div>
              <FieldLabel>Entity Status</FieldLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 12 }}>
                {['active', 'pending', 'suspended'].map(s => (
                  <button key={s}
                    onClick={() => updateStatus(modal.id, s)}
                    style={{
                      padding: '10px 4px', borderRadius: 10, border: 'none', cursor: 'pointer',
                      fontWeight: 800, fontSize: 10, textTransform: 'uppercase',
                      background: modal.status === s ? (s === 'active' ? '#10b981' : s === 'pending' ? '#f59e0b' : '#ef4444') : '#f1f5f9',
                      color: modal.status === s ? '#fff' : '#64748b',
                      transition: 'all 0.2s'
                    }}
                  >{s}</button>
                ))}
              </div>
              <textarea
                style={{ ...A.textarea, minHeight: 80, fontSize: 12, padding: 12, background: '#fff', border: '1px solid #e2e8f0' }}
                placeholder="Reasoning for status change..."
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>

            {/* Commissions & Verify */}
            <div>
              <FieldLabel>Platform Settings</FieldLabel>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="number"
                    value={commission.fee_percent}
                    onChange={e => setCommission({ ...commission, fee_percent: e.target.value })}
                    style={{ ...A.input, padding: '10px 12px', fontSize: 14, flex: 1 }}
                    placeholder="Fee %"
                  />
                  <button onClick={saveCommission} disabled={commission.loading} style={{ ...A.btnPrimary, padding: '0 16px', fontSize: 12 }}>Apply</button>
                </div>
                <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>Custom service fee for this entity.</p>
              </div>

              <button
                onClick={() => toggleVerify(modal.id, modal.is_verified)}
                style={{
                  ...A.btnGhost, width: '100%', justifyContent: 'center', padding: '12px', fontSize: 12,
                  borderColor: modal.is_verified ? '#64748b' : '#10b981',
                  color: modal.is_verified ? '#64748b' : '#10b981',
                  marginBottom: 16
                }}
              >
                <i className={`bx ${modal.is_verified ? 'bxs-badge-check' : 'bx-badge'}`} />
                {modal.is_verified ? 'Revoke Verification' : 'Grant Verification Seal'}
              </button>

              <div style={{ marginTop: 8, padding: 16, background: '#f8fafc', borderRadius: 14, border: '1px solid #e2e8f0' }}>
                <FieldLabel>Biteship Logistics Area</FieldLabel>
                <div style={{ position: 'relative' }}>
                  <input 
                    style={{ ...A.input, padding: '10px 12px', fontSize: 12 }} 
                    placeholder="Search Area (Kecamatan)..." 
                    onChange={e => handleSearchArea(e.target.value)}
                  />
                  {searchingArea && <div style={{ position: 'absolute', right: 10, top: 12, fontSize: 10, color: '#4f46e5' }}>Searching...</div>}
                  
                  {areas.length > 0 && (
                    <div style={{ position: 'absolute', zIndex: 100, left: 0, right: 0, top: '100%', mt: 4, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', maxH: 200, overflowY: 'auto' }}>
                      {areas.map(a => (
                        <div key={a.id} onClick={() => updateMerchantArea(a)} style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: 11 }}>
                          <div style={{ fontWeight: 800 }}>{a.name}</div>
                          <div style={{ color: '#64748b' }}>{a.city_name}, {a.province_name}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {modal.biteship_area_id ? (
                  <div style={{ marginTop: 10, fontSize: 11, fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="bx bxs-map-pin" /> AREA-ID: {modal.biteship_area_id}
                  </div>
                ) : (
                  <div style={{ marginTop: 10, fontSize: 11, fontWeight: 700, color: '#f59e0b' }}>
                    <i className="bx bx-error-circle" /> Logistics Area not configured
                  </div>
                )}
              </div>

              <div style={{ marginTop: 12, padding: 16, background: '#f8fafc', borderRadius: 14, border: '1px solid #e2e8f0' }}>
                <FieldLabel>Enabled Couriers</FieldLabel>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {logisticChannels.filter(lc => lc.is_active).map(c => {
                    const active = modal.enabled_couriers?.split(',').includes(c.code);
                    return (
                      <button
                        key={c.id}
                        onClick={() => toggleCourier(c.code)}
                        style={{
                          padding: '6px 4px', borderRadius: 8, fontSize: 10, fontWeight: 800,
                          border: active ? '1px solid #4f46e5' : '1px solid #e2e8f0',
                          background: active ? '#f5f7ff' : '#fff',
                          color: active ? '#4f46e5' : '#64748b',
                          cursor: 'pointer'
                        }}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
                <p style={{ fontSize: 9, color: '#94a3b8', marginTop: 8 }}>Select which logistics are available for this merchant. Empty means platform default.</p>
              </div>
            </div>
          </div>

          {/* Banner (Optional) */}
          {modal.banner_url && (
            <div style={{ marginBottom: 24, height: 100, borderRadius: 16, background: `url(${modal.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.8 }} />
          )}

          {/* Modal Footer Actions (User-style) */}
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'center' }}>
             <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>Merchant Entity registered since {fmtDate(modal.created_at)}</p>
             <button
                style={{ ...A.btnPrimary, width: '100%', justifyContent: 'center', padding: '12px', background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}
                onClick={() => setModal(null)}
             >
                Close Control Panel
             </button>
          </div>
        </Modal>
      )}
    </div>
  );
}