import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';
import { PageHeader, TablePanel, Modal, FieldLabel, A } from '../../lib/adminStyles.jsx';

const API = ADMIN_API_BASE;

const formatRp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

export default function MembershipTiers() {
  const [activeTab, setActiveTab] = useState('tiers');

  // --- TIERS STATE ---
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  // --- PRESETS STATE ---
  const [presets, setPresets] = useState([]);
  const [presetModal, setPresetModal] = useState(null);
  const [presetSaving, setPresetSaving] = useState(false);

  // --- TIER PRESETS STATE ---
  const [tierPresets, setTierPresets] = useState([]);
  const [tierPresetModal, setTierPresetModal] = useState(null);
  const [tierPresetSaving, setTierPresetSaving] = useState(false);

  const EMPTY = {
    name: '',
    level: 1,
    base_commission_rate: 0.1,
    min_active_mitra: 0,
    min_monthly_turnover: 0,
    min_total_transactions: 0,
    min_referrals: 0,
    min_performance_points: 0,
    color: '#6366f1',
    icon: 'military_tech',
    description: '',
    is_active: true
  };

  const EMPTY_PRESET = {
    name: '',
    description: '',
    is_active: true,
    levels: [{ level: 1, rate: 0.1 }]
  };

  const load = () => {
    setLoading(true);
    fetchJson(`${API}/membership-tiers`)
      .then(d => setTiers(Array.isArray(d) ? d : (d?.data || [])))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const loadPresets = () => {
    fetchJson(`${API}/commission-presets`)
      .then(d => setPresets(Array.isArray(d) ? d : (d?.data || [])))
      .catch(console.error);
      
    fetchJson(`${API}/tier-commission-presets`)
      .then(d => setTierPresets(Array.isArray(d) ? d : (d?.data || [])))
      .catch(console.error);
  };

  useEffect(() => { 
    load(); 
    loadPresets();
  }, []);

  // --- TIERS ACTIONS ---
  const save = (e) => {
    e.preventDefault();
    setSaving(true);
    
    const payload = {
        ...modal,
        level: parseInt(modal.level),
        base_commission_rate: parseFloat(modal.base_commission_rate),
        min_active_mitra: parseInt(modal.min_active_mitra),
        min_monthly_turnover: parseFloat(modal.min_monthly_turnover),
        min_total_transactions: parseInt(modal.min_total_transactions),
        min_referrals: parseInt(modal.min_referrals),
        min_performance_points: parseInt(modal.min_performance_points)
    };

    fetchJson(`${API}/membership-tiers/upsert`, { 
      method: 'POST', 
      body: JSON.stringify(payload) 
    })
      .then(() => { load(); setModal(null); })
      .catch(e => alert(e.message))
      .finally(() => setSaving(false));
  };

  const del = (id) => {
    if (!window.confirm('Hapus jenjang ini?')) return;
    fetchJson(`${API}/membership-tiers/delete?id=${id}`, { method: 'DELETE' })
      .then(load)
      .catch(e => alert(e.message));
  };

  // --- PRESETS ACTIONS ---
  const savePreset = (e) => {
    e.preventDefault();
    setPresetSaving(true);

    // Format levels
    const formattedLevels = presetModal.levels.map((lvl, idx) => ({
      level: idx + 1,
      rate: parseFloat(lvl.rate) || 0
    }));

    const payload = {
      ...presetModal,
      levels: formattedLevels
    };

    fetchJson(`${API}/commission-presets/upsert`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
      .then(() => { loadPresets(); setPresetModal(null); })
      .catch(e => alert(e.message))
      .finally(() => setPresetSaving(false));
  };

  const delPreset = (id) => {
    if (!window.confirm('Hapus preset ini? Preset yang dihapus tidak bisa digunakan lagi di produk baru.')) return;
    fetchJson(`${API}/commission-presets/delete?id=${id}`, { method: 'DELETE' })
      .then(loadPresets)
      .catch(e => alert(e.message));
  };

  const addPresetLevel = () => {
    setPresetModal(p => ({
      ...p,
      levels: [...p.levels, { level: p.levels.length + 1, rate: 0.05 }]
    }));
  };

  const removePresetLevel = (idx) => {
    setPresetModal(p => {
      const newLevels = [...p.levels];
      newLevels.splice(idx, 1);
      return { ...p, levels: newLevels };
    });
  };

  const updatePresetLevel = (idx, rate) => {
    setPresetModal(p => {
      const newLevels = [...p.levels];
      newLevels[idx].rate = rate;
      return { ...p, levels: newLevels };
    });
  };

  // --- TIER PRESETS ACTIONS ---
  const saveTierPreset = (e) => {
    e.preventDefault();
    setTierPresetSaving(true);
    fetchJson(`${API}/tier-commission-presets/upsert`, {
      method: 'POST',
      body: JSON.stringify(tierPresetModal)
    })
      .then(() => { loadPresets(); setTierPresetModal(null); })
      .catch(e => alert(e.message))
      .finally(() => setTierPresetSaving(false));
  };

  const delTierPreset = (id) => {
    if (!window.confirm('Hapus preset ini?')) return;
    fetchJson(`${API}/tier-commission-presets/delete?id=${id}`, { method: 'DELETE' })
      .then(loadPresets)
      .catch(e => alert(e.message));
  };

  const openTierPresetModal = (existing = null) => {
    if (existing) {
      setTierPresetModal(existing);
      return;
    }
    // create default item for every tier
    const defaultTiers = tiers.map(t => ({
      membership_tier_id: t.id,
      commission_rate: t.base_commission_rate || 0.1
    }));
    setTierPresetModal({
      name: '',
      description: '',
      is_active: true,
      tiers: defaultTiers
    });
  };

  const updateTierPresetRate = (tierId, rate) => {
    setTierPresetModal(p => {
      const newTiers = [...p.tiers];
      const idx = newTiers.findIndex(t => t.membership_tier_id === tierId);
      if (idx !== -1) {
        newTiers[idx].rate = rate; // keep old rate ref ? Wait, no
        newTiers[idx].commission_rate = parseFloat(rate) || 0;
      }
      return { ...p, tiers: newTiers };
    });
  };

  return (
    <div style={A.page} className="fade-in">
      <PageHeader 
        title="Konfigurasi Komisi & Jenjang" 
        subtitle="Atur jenjang karir (Membership) dan berbagai Preset Komisi."
      >
        {activeTab === 'tiers' && (
          <button style={A.btnPrimary} onClick={() => setModal({ ...EMPTY, level: tiers.length + 1 })}>
            <i className="bx bx-plus" /> Tambah Jenjang
          </button>
        )}
        {activeTab === 'presets' && (
          <button style={A.btnPrimary} onClick={() => setPresetModal({ ...EMPTY_PRESET })}>
            <i className="bx bx-plus" /> Tambah Preset Upline
          </button>
        )}
        {activeTab === 'tier_presets' && (
          <button style={A.btnPrimary} onClick={() => openTierPresetModal()}>
            <i className="bx bx-plus" /> Tambah Preset Tier Matrix
          </button>
        )}
      </PageHeader>

      <div style={{ display: 'flex', gap: 16, marginBottom: 24, borderBottom: '1px solid #e2e8f0' }}>
        <button 
          onClick={() => setActiveTab('tiers')}
          style={{ 
            padding: '12px 16px', border: 'none', background: 'transparent',
            fontWeight: 600, fontSize: 14, cursor: 'pointer',
            color: activeTab === 'tiers' ? '#4f46e5' : '#64748b',
            borderBottom: activeTab === 'tiers' ? '2px solid #4f46e5' : '2px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          Membership Tiers
        </button>
        <button 
          onClick={() => setActiveTab('presets')}
          style={{ 
            padding: '12px 16px', border: 'none', background: 'transparent',
            fontWeight: 600, fontSize: 14, cursor: 'pointer',
            color: activeTab === 'presets' ? '#4f46e5' : '#64748b',
            borderBottom: activeTab === 'presets' ? '2px solid #4f46e5' : '2px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          Multi-Level Presets
        </button>
        <button 
          onClick={() => setActiveTab('tier_presets')}
          style={{ 
            padding: '12px 16px', border: 'none', background: 'transparent',
            fontWeight: 600, fontSize: 14, cursor: 'pointer',
            color: activeTab === 'tier_presets' ? '#4f46e5' : '#64748b',
            borderBottom: activeTab === 'tier_presets' ? '2px solid #4f46e5' : '2px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          Tier Commission Presets
        </button>
      </div>

      {activeTab === 'tiers' && (
        <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9' }} className="fade-in">
          <TablePanel loading={loading}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
              <thead>
                <tr>
                  {['Jenjang & Level', 'Syarat Upgrade', 'Komisi Dasar', 'Warna/Ikon', 'Status', 'Opsi'].map((h, i) => (
                    <th key={h} style={{ 
                      ...A.th, 
                      textAlign: i === 5 ? 'right' : 'left', 
                      paddingLeft: i === 0 ? 24 : 16, 
                      paddingRight: i === 5 ? 24 : 16 
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tiers.length === 0 && !loading ? (
                  <tr><td colSpan={6} style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                    <i className="bx bx-star" style={{ fontSize: 40, display: 'block', marginBottom: 8, opacity: 0.2 }} />
                    Belum ada jenjang keanggotaan.
                  </td></tr>
                ) : tiers.map((tier, idx) => (
                  <tr key={tier.id}
                    style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f5f7ff'}
                    onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa'}
                  >
                    <td style={{ ...A.td, paddingLeft: 24 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ 
                          width: 40, height: 40, borderRadius: 11, 
                          background: tier.color + '20', 
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 
                        }}>
                          <span className="material-icons" style={{ fontSize: 20, color: tier.color }}>{tier.icon}</span>
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{tier.name}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Level {tier.level}</div>
                        </div>
                      </div>
                    </td>
                    <td style={A.td}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className='bx bx-user' style={{color: '#94a3b8'}} /> {tier.min_active_mitra} Mitra Aktif
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <i className='bx bx-trending-up' style={{color: '#94a3b8'}} /> {formatRp(tier.min_monthly_turnover)} / bln
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px', marginTop: 4, fontSize: 10, color: '#94a3b8' }}>
                           {tier.min_total_transactions > 0 && <span>• {tier.min_total_transactions} Trx</span>}
                           {tier.min_referrals > 0 && <span>• {tier.min_referrals} Ref</span>}
                           {tier.min_performance_points > 0 && <span>• {tier.min_performance_points} Pts</span>}
                        </div>
                      </div>
                    </td>
                    <td style={A.td}>
                      <span style={{ 
                          padding: '4px 8px', borderRadius: 6, background: '#f0fdf4', 
                          color: '#16a34a', fontWeight: 700, fontSize: 12 
                      }}>
                        {(tier.base_commission_rate * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td style={A.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 14, height: 14, borderRadius: 4, background: tier.color, border: '1px solid rgba(0,0,0,0.1)' }} />
                          <code style={{ fontSize: 11 }}>{tier.color}</code>
                      </div>
                    </td>
                    <td style={A.td}>
                      <span style={{ 
                        padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: tier.is_active ? '#ecfdf5' : '#fff1f2',
                        color: tier.is_active ? '#059669' : '#e11d48'
                      }}>
                        {tier.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ ...A.td, paddingRight: 24, textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button style={A.iconBtn('#6366f1', '#eef2ff')} onClick={() => setModal({ ...tier })} title="Edit"><i className="bx bx-pencil" /></button>
                        <button style={A.iconBtn('#ef4444', '#fff1f2')} onClick={() => del(tier.id)} title="Hapus"><i className="bx bx-trash" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TablePanel>
        </div>
      )}

      {activeTab === 'presets' && (
        <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9' }} className="fade-in">
          <TablePanel loading={loading}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
              <thead>
                <tr>
                  {['Nama Preset', 'Distribusi Level', 'Total Komisi', 'Status', 'Opsi'].map((h, i) => (
                    <th key={h} style={{ 
                      ...A.th, 
                      textAlign: i === 4 ? 'right' : 'left', 
                      paddingLeft: i === 0 ? 24 : 16, 
                      paddingRight: i === 4 ? 24 : 16 
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {presets.length === 0 && !loading ? (
                  <tr><td colSpan={5} style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                    <i className="bx bx-share-alt" style={{ fontSize: 40, display: 'block', marginBottom: 8, opacity: 0.2 }} />
                    Belum ada Preset Komisi Multi-Level.
                  </td></tr>
                ) : presets.map((preset, idx) => {
                  const totalRate = preset.levels?.reduce((sum, lvl) => sum + (lvl.rate || 0), 0) || 0;
                  return (
                    <tr key={preset.id}
                      style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f5f7ff'}
                      onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa'}
                    >
                      <td style={{ ...A.td, paddingLeft: 24 }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{preset.name}</div>
                        {preset.description && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{preset.description}</div>}
                      </td>
                      <td style={A.td}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {(preset.levels || []).map(lvl => (
                            <div key={lvl.level} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '2px 8px', fontSize: 11, color: '#475569' }}>
                              <span style={{ fontWeight: 700 }}>Lvl {lvl.level}:</span> {(lvl.rate * 100).toFixed(1)}%
                            </div>
                          ))}
                        </div>
                      </td>
                      <td style={A.td}>
                        <span style={{ 
                            padding: '4px 8px', borderRadius: 6, background: '#eef2ff', 
                            color: '#4f46e5', fontWeight: 700, fontSize: 12 
                        }}>
                          {(totalRate * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td style={A.td}>
                        <span style={{ 
                          padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                          background: preset.is_active ? '#ecfdf5' : '#fff1f2',
                          color: preset.is_active ? '#059669' : '#e11d48'
                        }}>
                          {preset.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ ...A.td, paddingRight: 24, textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button style={A.iconBtn('#6366f1', '#eef2ff')} onClick={() => setPresetModal({ ...preset })} title="Edit"><i className="bx bx-pencil" /></button>
                          <button style={A.iconBtn('#ef4444', '#fff1f2')} onClick={() => delPreset(preset.id)} title="Hapus"><i className="bx bx-trash" /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </TablePanel>
        </div>
      )}

      {activeTab === 'tier_presets' && (
        <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9' }} className="fade-in">
          <TablePanel loading={loading}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
              <thead>
                <tr>
                  {['Nama Preset Matrix', 'Rincian Komisi per Tier', 'Status', 'Opsi'].map((h, i) => (
                    <th key={h} style={{ 
                      ...A.th, 
                      textAlign: i === 3 ? 'right' : 'left', 
                      paddingLeft: i === 0 ? 24 : 16, 
                      paddingRight: i === 3 ? 24 : 16 
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tierPresets.length === 0 && !loading ? (
                  <tr><td colSpan={4} style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                    <i className="bx bx-matrix" style={{ fontSize: 40, display: 'block', marginBottom: 8, opacity: 0.2 }} />
                    Belum ada Preset Tier Matrix.
                  </td></tr>
                ) : tierPresets.map((preset, idx) => {
                  return (
                    <tr key={preset.id}
                      style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f5f7ff'}
                      onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa'}
                    >
                      <td style={{ ...A.td, paddingLeft: 24 }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{preset.name}</div>
                        {preset.description && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{preset.description}</div>}
                      </td>
                      <td style={A.td}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {(preset.tiers || []).map(tItem => {
                            const tierObj = tiers.find(t => t.id === tItem.membership_tier_id);
                            return (
                              <div key={tItem.membership_tier_id} style={{ background: tierObj?.color ? tierObj.color+'15' : '#f8fafc', border: '1px solid '+(tierObj?.color ? tierObj.color+'40' : '#e2e8f0'), borderRadius: 6, padding: '2px 8px', fontSize: 11, color: tierObj?.color || '#475569' }}>
                                <span style={{ fontWeight: 700 }}>{tierObj ? tierObj.name : 'Unknown'}:</span> {(tItem.commission_rate * 100).toFixed(1)}%
                              </div>
                            )
                          })}
                        </div>
                      </td>
                      <td style={A.td}>
                        <span style={{ 
                          padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                          background: preset.is_active ? '#ecfdf5' : '#fff1f2',
                          color: preset.is_active ? '#059669' : '#e11d48'
                        }}>
                          {preset.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ ...A.td, paddingRight: 24, textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button style={A.iconBtn('#6366f1', '#eef2ff')} onClick={() => openTierPresetModal(preset)} title="Edit"><i className="bx bx-pencil" /></button>
                          <button style={A.iconBtn('#ef4444', '#fff1f2')} onClick={() => delTierPreset(preset.id)} title="Hapus"><i className="bx bx-trash" /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </TablePanel>
        </div>
      )}

      {/* MODAL: TIERS */}
      {modal && (
        <Modal title={modal.id ? 'Edit Jenjang' : 'Tambah Jenjang'} onClose={() => setModal(null)}>
          <form onSubmit={save}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: 'span 2' }}>
                <FieldLabel>Nama Jenjang</FieldLabel>
                <input style={{ ...A.select, width: '100%' }} placeholder="Misal: Silver" value={modal.name} onChange={e => setModal({...modal, name: e.target.value})} required />
              </div>
              
              <div>
                <FieldLabel>Level (Urutan)</FieldLabel>
                <input type="number" style={{ ...A.select, width: '100%' }} value={modal.level} onChange={e => setModal({...modal, level: e.target.value})} required />
              </div>
              
              <div>
                <FieldLabel>Komisi Dasar (%)</FieldLabel>
                <input type="number" step="0.01" style={{ ...A.select, width: '100%' }} value={modal.base_commission_rate} onChange={e => setModal({...modal, base_commission_rate: e.target.value})} required />
              </div>

              <div>
                <FieldLabel>Min. Mitra Aktif</FieldLabel>
                <input type="number" style={{ ...A.select, width: '100%' }} value={modal.min_active_mitra} onChange={e => setModal({...modal, min_active_mitra: e.target.value})} required />
              </div>

              <div>
                <FieldLabel>Min. Omset Bulanan</FieldLabel>
                <input type="number" style={{ ...A.select, width: '100%' }} value={modal.min_monthly_turnover} onChange={e => setModal({...modal, min_monthly_turnover: e.target.value})} required />
              </div>

              <div>
                <FieldLabel>Min. Transaksi</FieldLabel>
                <input type="number" style={{ ...A.select, width: '100%' }} value={modal.min_total_transactions} onChange={e => setModal({...modal, min_total_transactions: e.target.value})} required />
              </div>

              <div>
                <FieldLabel>Min. Referal</FieldLabel>
                <input type="number" style={{ ...A.select, width: '100%' }} value={modal.min_referrals} onChange={e => setModal({...modal, min_referrals: e.target.value})} required />
              </div>

              <div>
                <FieldLabel>Min. Poin Performa</FieldLabel>
                <input type="number" style={{ ...A.select, width: '100%' }} value={modal.min_performance_points} onChange={e => setModal({...modal, min_performance_points: e.target.value})} required />
              </div>

              <div>
                <FieldLabel>Warna (Hex)</FieldLabel>
                <div style={{ display: 'flex', gap: 8 }}>
                    <input type="color" style={{ width: 42, height: 42, padding: 2, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff' }} value={modal.color} onChange={e => setModal({...modal, color: e.target.value})} />
                    <input style={{ ...A.select, flex: 1 }} value={modal.color} onChange={e => setModal({...modal, color: e.target.value})} />
                </div>
              </div>

              <div>
                <FieldLabel>Ikon (Material Icon)</FieldLabel>
                <input style={{ ...A.select, width: '100%' }} placeholder="military_tech, diamond, storefront..." value={modal.icon} onChange={e => setModal({...modal, icon: e.target.value})} />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <FieldLabel>Deskripsi / Benefit</FieldLabel>
                <textarea style={{ ...A.textarea, minHeight: 60 }} placeholder="Jelaskan syarat dan keuntungan tier ini..." value={modal.description} onChange={e => setModal({...modal, description: e.target.value})} />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <FieldLabel>Preset Komisi Multi-Level (Upline)</FieldLabel>
                <select 
                  style={{ ...A.select, width: '100%' }} 
                  value={modal.commission_matrix_preset_id || ''} 
                  onChange={e => setModal({...modal, commission_matrix_preset_id: e.target.value || null})}
                >
                  <option value="">-- Gunakan Default Platform --</option>
                  {presets.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Pilih preset untuk mendistribusikan komisi ke jaringan upline saat mitra di level ini melakukan penjualan.</p>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={modal.is_active} onChange={e => setModal({...modal, is_active: e.target.checked})} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Aktifkan jenjang ini</span>
                </label>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 24 }}>
              <button type="button" style={A.btnGhost} onClick={() => setModal(null)}>Batal</button>
              <button type="submit" style={A.btnPrimary} disabled={saving}>
                {saving ? '...' : <><i className="bx bx-save" /> Simpan Perubahan</>}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: PRESETS */}
      {presetModal && (
        <Modal title={presetModal.id ? 'Edit Preset' : 'Tambah Preset'} onClose={() => setPresetModal(null)}>
          <form onSubmit={savePreset}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
              <div>
                <FieldLabel>Nama Preset Upline</FieldLabel>
                <input style={{ ...A.select, width: '100%' }} placeholder="Misal: Standard MLM 3-Level" value={presetModal.name} onChange={e => setPresetModal({...presetModal, name: e.target.value})} required />
              </div>
              
              <div>
                <FieldLabel>Deskripsi</FieldLabel>
                <textarea style={{ ...A.textarea, minHeight: 60 }} placeholder="Penjelasan mengenai preset ini..." value={presetModal.description} onChange={e => setPresetModal({...presetModal, description: e.target.value})} />
              </div>

              <div>
                <FieldLabel>Distribusi Multi-Level</FieldLabel>
                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {(presetModal.levels || []).map((lvl, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 60, fontWeight: 700, color: '#475569', fontSize: 13 }}>Level {idx + 1}</div>
                        <input 
                          type="number" step="0.01" style={{ ...A.select, flex: 1 }} 
                          placeholder="Rate (contoh: 0.10 untuk 10%)" 
                          value={lvl.rate} 
                          onChange={e => updatePresetLevel(idx, e.target.value)} 
                          required 
                        />
                        <button type="button" onClick={() => removePresetLevel(idx)} style={{ ...A.iconBtn('#ef4444', 'transparent'), flexShrink: 0 }}>
                          <i className="bx bx-x" style={{ fontSize: 20 }} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={addPresetLevel} style={{ ...A.btnGhost, width: '100%', marginTop: 12, padding: '8px 0', border: '1px dashed #cbd5e1' }}>
                    <i className="bx bx-plus" /> Tambah Kedalaman Level
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={presetModal.is_active} onChange={e => setPresetModal({...presetModal, is_active: e.target.checked})} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Aktifkan preset ini</span>
                </label>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 24 }}>
              <button type="button" style={A.btnGhost} onClick={() => setPresetModal(null)}>Batal</button>
              <button type="submit" style={A.btnPrimary} disabled={presetSaving}>
                {presetSaving ? '...' : <><i className="bx bx-save" /> Simpan Preset</>}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: TIER PRESETS */}
      {tierPresetModal && (
        <Modal title={tierPresetModal.id ? 'Edit Preset Tier Matrix' : 'Tambah Preset Tier Matrix'} onClose={() => setTierPresetModal(null)}>
          <form onSubmit={saveTierPreset}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
              <div>
                <FieldLabel>Nama Preset Matrix</FieldLabel>
                <input style={{ ...A.select, width: '100%' }} placeholder="Misal: Margin Tinggi" value={tierPresetModal.name} onChange={e => setTierPresetModal({...tierPresetModal, name: e.target.value})} required />
              </div>
              
              <div>
                <FieldLabel>Deskripsi</FieldLabel>
                <textarea style={{ ...A.textarea, minHeight: 60 }} placeholder="Penjelasan preset matriks komisi ini..." value={tierPresetModal.description} onChange={e => setTierPresetModal({...tierPresetModal, description: e.target.value})} />
              </div>

              <div>
                <FieldLabel>Komisi per Jenjang</FieldLabel>
                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {(tierPresetModal.tiers || []).map((tItem) => {
                      const tierObj = tiers.find(t => t.id === tItem.membership_tier_id);
                      return (
                        <div key={tItem.membership_tier_id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 120, fontWeight: 700, color: '#475569', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: tierObj?.color || '#ccc' }}></div>
                            {tierObj ? tierObj.name : 'Unknown Tier'}
                          </div>
                          <input 
                            type="number" step="0.01" style={{ ...A.select, flex: 1 }} 
                            placeholder="Rate (contoh: 0.10 untuk 10%)" 
                            value={tItem.commission_rate} 
                            onChange={e => updateTierPresetRate(tItem.membership_tier_id, e.target.value)} 
                            required 
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={tierPresetModal.is_active} onChange={e => setTierPresetModal({...tierPresetModal, is_active: e.target.checked})} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Aktifkan preset ini</span>
                </label>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 24 }}>
              <button type="button" style={A.btnGhost} onClick={() => setTierPresetModal(null)}>Batal</button>
              <button type="submit" style={A.btnPrimary} disabled={tierPresetSaving}>
                {tierPresetSaving ? '...' : <><i className="bx bx-save" /> Simpan Preset Matrix</>}
              </button>
            </div>
          </form>
        </Modal>
      )}
      
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
    </div>
  );
}
