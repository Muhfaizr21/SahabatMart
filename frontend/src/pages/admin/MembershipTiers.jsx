import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';
import { PageHeader, TablePanel, Modal, FieldLabel, A } from '../../lib/adminStyles.jsx';

const API = ADMIN_API_BASE;

const formatRp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

export default function MembershipTiers() {
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

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

  const load = () => {
    setLoading(true);
    fetchJson(`${API}/membership-tiers`)
      .then(d => setTiers(Array.isArray(d) ? d : (d?.data || [])))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const save = (e) => {
    e.preventDefault();
    setSaving(true);
    
    // Ensure numeric fields are correct type
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
      .then(() => { 
        load(); 
        setModal(null); 
      })
      .catch(e => alert(e.message))
      .finally(() => setSaving(false));
  };

  const del = (id) => {
    if (!window.confirm('Hapus jenjang ini?')) return;
    fetchJson(`${API}/membership-tiers/delete?id=${id}`, { method: 'DELETE' })
      .then(load)
      .catch(e => alert(e.message));
  };

  return (
    <div style={A.page} className="fade-in">
      <PageHeader 
        title="Membership Tiers" 
        subtitle="Atur jenjang karir mitra Akuglow dan syarat upgrade-nya secara dinamis."
      >
        <button style={A.btnPrimary} onClick={() => setModal({ ...EMPTY, level: tiers.length + 1 })}>
          <i className="bx bx-plus" /> Tambah Jenjang
        </button>
      </PageHeader>

      <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9' }}>
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
      
      {/* Load Material Icons if not present */}
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
    </div>
  );
}
