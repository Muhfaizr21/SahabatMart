import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';
import { PageHeader, TablePanel, Modal, FieldLabel, A } from '../../lib/adminStyles.jsx';

const API = ADMIN_API_BASE;

const formatRp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

const ICON_OPTIONS = [
  { value: 'star', label: '⭐ Bintang' },
  { value: 'workspace_premium', label: '🏆 Trophy' },
  { value: 'verified', label: '✅ Terverifikasi' },
  { value: 'diamond', label: '💎 Diamond' },
  { value: 'emoji_events', label: '🎖️ Medal' },
  { value: 'military_tech', label: '🎖️ Teknologi' },
  { value: 'card_membership', label: '🎫 Kartu Anggota' },
  { value: 'loyalty', label: '💚 Loyalty' },
  { value: 'account_circle', label: '👤 Akun' },
  { value: 'groups', label: '👥 Grup' },
  { value: 'trending_up', label: '📈 Naik' },
  { value: 'bolt', label: '⚡ Kilat' },
  { value: 'local_fire_department', label: '🔥 Api' },
  { value: 'shield', label: '🛡️ Perisai' },
  { value: 'security', label: '🔒 Aman' },
  { value: 'storefront', label: '🏪 Toko' },
  { value: 'sell', label: '🏷️ Jual' },
  { value: 'redeem', label: '🎁 Hadiah' },
  { value: 'payments', label: '💰 Bayar' },
  { value: 'insights', label: '📊 Data' },
  { value: 'school', label: '🎓 Sekolah' },
  { value: 'campaign', label: '📢 Kampanye' },
  { value: 'celebration', label: '🎉 Pesta' },
  { value: 'emoji_good', label: '👍 Bagus' },
  { value: 'auto_awesome', label: '✨ Hebat' },
  { value: 'crown', label: '👑 Mahkota' },
  { value: 'rocket_launch', label: '🚀 Roket' },
  { value: 'favorite', label: '❤️ Fav' },
  { value: 'thumb_up', label: '👍 Suka' },
  { value: 'build', label: '🔧 Alat' },
];

export default function MembershipTiers() {
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notify, setNotify] = useState(null);

  const EMPTY = {
    name: '',
    level: 1,
    min_active_mitra: 0,
    min_monthly_turnover: 0,
    min_total_transactions: 0,
    min_referrals: 0,
    min_performance_points: 0,
    max_commission_depth: 1,
    base_commission_rate: 0.05,
    color: '#6366f1',
    icon: 'workspace_premium',
    description: '',
    is_active: true
  };

  const toast = (msg, type = 'success') => {
    setNotify({ msg, type });
    setTimeout(() => setNotify(null), 3000);
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

    const payload = {
      ...modal,
      level: parseInt(modal.level),
      min_active_mitra: parseInt(modal.min_active_mitra || 0),
      min_monthly_turnover: parseFloat(modal.min_monthly_turnover || 0),
      min_total_transactions: parseInt(modal.min_total_transactions || 0),
      min_referrals: parseInt(modal.min_referrals || 0),
      min_performance_points: parseInt(modal.min_performance_points || 0),
      min_commission_depth: 1,
      max_commission_depth: parseInt(modal.max_commission_depth || 1),
      base_commission_rate: parseFloat(modal.base_commission_rate || 0),
    };

    fetchJson(`${API}/membership-tiers/upsert`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
      .then(() => {
        load();
        setModal(null);
        toast('Berhasil disimpan');
      })
      .catch(e => toast(e.message, 'error'))
      .finally(() => setSaving(false));
  };

  const del = (id) => {
    if (!window.confirm('Hapus jenjang ini?')) return;
    fetchJson(`${API}/membership-tiers/delete?id=${id}`, { method: 'DELETE' })
      .then(() => { load(); toast('Berhasil dihapus'); })
      .catch(e => toast(e.message, 'error'));
  };

  return (
    <div style={A.page} className="fade-in">

      {/* TOAST */}
      {notify && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          background: notify.type === 'error' ? '#fee2e2' : '#d1fae5',
          color: notify.type === 'error' ? '#991b1b' : '#065f46',
          padding: '12px 20px', borderRadius: 10,
          fontWeight: 600, fontSize: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          border: `1px solid ${notify.type === 'error' ? '#fca5a5' : '#6ee7b7'}`,
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'slideInRight 0.3s ease'
        }}>
          <i className={`bx ${notify.type === 'error' ? 'bx-error' : 'bx-check-circle'}`} style={{ fontSize: 18 }} />
          {notify.msg}
        </div>
      )}

      <PageHeader
        title="Jenjang Keanggotaan"
        subtitle="Atur jenjang membership, syarat upgrade, dan komisi tiap jenjang."
      >
        <button style={A.btnPrimary} onClick={() => setModal({ ...EMPTY, level: tiers.length + 1 })}>
          <i className="bx bx-plus" /> Tambah Jenjang
        </button>
      </PageHeader>

      {/* STATS ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Jenjang', val: tiers.length, icon: 'bx-layers', color: '#6366f1', bg: '#eef2ff' },
          { label: 'Aktif', val: tiers.filter(t => t.is_active).length, icon: 'bx-check-circle', color: '#059669', bg: '#ecfdf5' },
          { label: 'Nonaktif', val: tiers.filter(t => !t.is_active).length, icon: 'bx-x-circle', color: '#e11d48', bg: '#fff1f2' },
          { label: 'Max Komisi', val: Math.max(...tiers.map(t => t.max_commission_depth), 0) + ' Level', icon: 'bx-network-chart', color: '#d97706', bg: '#fef3c7' },
        ].map((s, i) => (
          <div key={i} style={{
            background: s.bg, borderRadius: 14, padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: 14,
            border: `1px solid ${s.color}30`
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: s.color + '20',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <i className={`bx ${s.icon}`} style={{ fontSize: 20, color: s.color }} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* TABLE */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', overflow: 'hidden' }} className="fade-in">
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <TablePanel loading={loading}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Jenjang', 'Syarat Upgrade', 'Komisi & Max Level', 'Warna & Ikon', 'Status', 'Opsi'].map((h, i) => (
                  <th key={h} style={{
                    ...A.th,
                    textAlign: i === 5 ? 'right' : 'left',
                    paddingLeft: i === 0 ? 28 : 16,
                    paddingRight: i === 5 ? 28 : 16,
                    fontSize: 12,
                    color: '#64748b',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    borderBottom: '1px solid #e2e8f0'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tiers.length === 0 && !loading ? (
                <tr><td colSpan={6} style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                  <i className="bx bx-layer" style={{ fontSize: 48, display: 'block', marginBottom: 10, opacity: 0.25 }} />
                  <div style={{ fontSize: 15, fontWeight: 600 }}>Belum ada jenjang</div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>Klik "Tambah Jenjang" untuk membuat</div>
                </td></tr>
              ) : tiers.map((tier, idx) => (
                <tr key={tier.id}
                  style={{ borderBottom: idx < tiers.length - 1 ? '1px solid #f1f5f9' : 'none' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {/* Jenjang */}
                  <td style={{ ...A.td, paddingLeft: 28 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: 14,
                        background: tier.color + '18',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        border: `1.5px solid ${tier.color}40`
                      }}>
                        <span className="material-icons" style={{ fontSize: 24, color: tier.color }}>{tier.icon}</span>
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>{tier.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                          <span style={{
                            background: tier.color + '18', color: tier.color,
                            padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700
                          }}>Level {tier.level}</span>
                          <span style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>
                            {(tier.base_commission_rate * 100).toFixed(0)}% komisi
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Syarat Upgrade */}
                  <td style={A.td}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {[
                        { icon: 'bx-user-check', label: 'Mitra Qualified', val: tier.min_active_mitra },
                        { icon: 'bx-trending-up', label: 'Omset / bulan', val: tier.min_monthly_turnover > 0 ? formatRp(tier.min_monthly_turnover) : '-' },
                        { icon: 'bx-receipt', label: 'Transaksi', val: tier.min_total_transactions || '-' },
                        { icon: 'bx-user-plus', label: 'Referral', val: tier.min_referrals || '-' },
                        { icon: 'bx-trophy', label: 'Poin Performa', val: tier.min_performance_points || '-' },
                      ].filter(r => r.val && r.val !== '-' && r.val > 0).slice(0, 3).map((r, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569' }}>
                          <i className={r.icon} style={{ color: tier.color, fontSize: 14, width: 16 }} />
                          <span style={{ color: '#94a3b8', fontSize: 11 }}>{r.label}:</span>
                          <span style={{ fontWeight: 700, color: '#1e293b' }}>{r.val}</span>
                        </div>
                      ))}
                    </div>
                  </td>

                  {/* Komisi & Max Level */}
                  <td style={A.td}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          background: '#eef2ff', color: '#4f46e5',
                          padding: '3px 10px', borderRadius: 8, fontSize: 12, fontWeight: 800
                        }}>
                          {(tier.base_commission_rate * 100).toFixed(0)}%
                        </span>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>base komisi</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          background: '#fef3c7', color: '#d97706',
                          padding: '3px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700
                        }}>
                          Max {tier.max_commission_depth} Level
                        </span>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>kedalaman</span>
                      </div>
                    </div>
                  </td>

                  {/* Warna & Ikon */}
                  <td style={A.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: tier.color, border: '1.5px solid rgba(0,0,0,0.1)'
                      }} />
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>{tier.color}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <span className="material-icons" style={{ fontSize: 16, color: tier.color }}>{tier.icon}</span>
                          <span style={{ fontSize: 10, color: '#94a3b8' }}>{tier.icon}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td style={A.td}>
                    <span style={{
                      padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                      background: tier.is_active ? '#dcfce7' : '#fee2e2',
                      color: tier.is_active ? '#15803d' : '#b91c1c',
                      border: `1px solid ${tier.is_active ? '#86efac' : '#fca5a5'}`
                    }}>
                      <i className={`bx ${tier.is_active ? 'bx-check' : 'bx-x'}`} style={{ fontSize: 13, marginRight: 4 }} />
                      {tier.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>

                  {/* Opsi */}
                  <td style={{ ...A.td, paddingRight: 28, textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 8 }}>
                      <button
                        style={{ ...A.iconBtn('#6366f1', '#eef2ff'), width: 36, height: 36 }}
                        onClick={() => setModal({ ...tier, max_commission_depth: tier.max_commission_depth || 1 })}
                        title="Edit"
                      >
                        <i className="bx bx-pencil" />
                      </button>
                      <button
                        style={{ ...A.iconBtn('#ef4444', '#fff1f2'), width: 36, height: 36 }}
                        onClick={() => del(tier.id)}
                        title="Hapus"
                      >
                        <i className="bx bx-trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TablePanel>
        </div>
      </div>

      {/* MODAL */}
      {modal && (
        <Modal title={modal.id ? `Edit Jenjang — ${modal.name}` : 'Tambah Jenjang'} onClose={() => setModal(null)}>
          <form onSubmit={save}>
            <div className="tier-form-grid">

              {/* Nama */}
              <div style={{ gridColumn: 'span 2' }}>
                <FieldLabel>Nama Jenjang</FieldLabel>
                <input
                  style={{ ...A.select, width: '100%' }}
                  placeholder="Contoh: Bronze, Silver, Gold"
                  value={modal.name || ''}
                  onChange={e => setModal({ ...modal, name: e.target.value })}
                  required
                />
              </div>

              {/* Level */}
              <div>
                <FieldLabel>Level (Urutan)</FieldLabel>
                <input type="number" min="1" style={{ ...A.select, width: '100%' }}
                  value={modal.level || 1}
                  onChange={e => setModal({ ...modal, level: parseInt(e.target.value) })} required />
              </div>

              {/* Base Commission Rate */}
              <div>
                <FieldLabel>Komisi Dasar (%)</FieldLabel>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="number" step="0.1" min="0" max="100" style={{ ...A.select, flex: 1 }}
                    value={((modal.base_commission_rate || 0) * 100).toFixed(1)}
                    onChange={e => setModal({ ...modal, base_commission_rate: parseFloat(e.target.value) / 100 })} required />
                  <span style={{ fontWeight: 700, color: '#64748b' }}>%</span>
                </div>
              </div>

              {/* Max Commission Depth */}
              <div>
                <FieldLabel>Max Level Komisi</FieldLabel>
                <input type="number" min="1" style={{ ...A.select, width: '100%' }}
                  value={modal.max_commission_depth || 1}
                  onChange={e => setModal({ ...modal, max_commission_depth: parseInt(e.target.value) })} />
                <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>Min = 1 otomatis</p>
              </div>

              {/* Warna */}
              <div>
                <FieldLabel>Warna</FieldLabel>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="color" style={{ width: 42, height: 42, padding: 2, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}
                    value={modal.color || '#6366f1'}
                    onChange={e => setModal({ ...modal, color: e.target.value })} />
                  <input style={{ ...A.select, flex: 1 }}
                    value={modal.color || '#6366f1'}
                    onChange={e => setModal({ ...modal, color: e.target.value })} />
                </div>
              </div>

              {/* Ikon */}
              <div>
                <FieldLabel>Ikon</FieldLabel>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <select style={{ ...A.select, flex: 1 }}
                    value={modal.icon || 'workspace_premium'}
                    onChange={e => setModal({ ...modal, icon: e.target.value })}>
                    {ICON_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <div style={{
                    width: 42, height: 42, borderRadius: 10,
                    background: (modal.color || '#6366f1') + '18',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <span className="material-icons" style={{ fontSize: 20, color: modal.color || '#6366f1' }}>{modal.icon || 'workspace_premium'}</span>
                  </div>
                </div>
              </div>

              {/* Syarat Upgrade */}
              <div style={{ gridColumn: 'span 2', background: '#f8fafc', padding: 18, borderRadius: 14, border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#475569', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="bx bx-arrow-up-circle" style={{ color: '#6366f1', fontSize: 16 }} />
                  Syarat Upgrade
                </div>
                <div className="tier-upgrade-grid">
                  {[
                    { field: 'min_active_mitra', label: 'Min. Mitra Qualified', hint: 'Mitra dgn downline aktif' },
                    { field: 'min_monthly_turnover', label: 'Min. Omset / Bulan (Rp)', hint: '' },
                    { field: 'min_total_transactions', label: 'Min. Transaksi', hint: '' },
                    { field: 'min_referrals', label: 'Min. Referral', hint: '' },
                    { field: 'min_performance_points', label: 'Min. Poin Performa', hint: 'Aktivitas: jual, training, recruit' },
                  ].map(f => (
                    <div key={f.field}>
                      <FieldLabel>{f.label}</FieldLabel>
                      <input type="number" min="0" style={{ ...A.select, width: '100%' }}
                        value={modal[f.field] || 0}
                        onChange={e => setModal({ ...modal, [f.field]: parseInt(e.target.value) || 0 })} />
                      {f.hint && <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{f.hint}</p>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Deskripsi */}
              <div style={{ gridColumn: 'span 2' }}>
                <FieldLabel>Deskripsi / Benefit</FieldLabel>
                <textarea style={{ ...A.textarea, minHeight: 72 }}
                  placeholder="Jelaskan keuntungan dan benefit jenjang ini..."
                  value={modal.description || ''}
                  onChange={e => setModal({ ...modal, description: e.target.value })} />
              </div>

              {/* Aktif */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', background: modal.is_active ? '#f0fdf4' : '#fff1f2' }}>
                  <input type="checkbox" checked={modal.is_active}
                    onChange={e => setModal({ ...modal, is_active: e.target.checked })} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: modal.is_active ? '#15803d' : '#b91c1c' }}>
                    {modal.is_active ? 'Jenjang Aktif — dapat digunakan oleh mitra' : 'Jenjang Nonaktif — tidak tersedia'}
                  </span>
                </label>
              </div>

            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 24 }}>
              <button type="button" style={{ ...A.btnGhost, width: '100%' }} onClick={() => setModal(null)}>Batal</button>
              <button type="submit" style={{ ...A.btnPrimary, width: '100%' }} disabled={saving}>
                {saving ? 'Menyimpan...' : <><i className="bx bx-save" /> Simpan Jenjang</>}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .tier-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .tier-upgrade-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        @media (max-width: 600px) {
          .tier-form-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          .tier-form-grid > div {
            grid-column: span 1 !important;
          }
          .tier-upgrade-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
        }
      `}</style>
    </div>
  );
}