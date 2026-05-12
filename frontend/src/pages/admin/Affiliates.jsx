import React, { useState, useEffect, useCallback } from 'react';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';
import { PageHeader, StatRow, TablePanel, Modal, FieldLabel, statusBadge, idr, fmtDate, A } from '../../lib/adminStyles.jsx';

const API = ADMIN_API_BASE;

const STATUS_BADGE = {
  active:   { bg: '#dcfce7', color: '#16a34a' },
  pending_verification: { bg: '#fef9c3', color: '#ca8a04' },
  suspended: { bg: '#fee2e2', color: '#dc2626' },
  completed: { bg: '#dcfce7', color: '#16a34a' },
  pending:   { bg: '#fef9c3', color: '#ca8a04' },
  rejected:  { bg: '#fee2e2', color: '#dc2626' },
  processed: { bg: '#dbeafe', color: '#2563eb' },
};

export default function AdminAffiliates() {
  const [affiliates, setAffiliates] = useState([]);
  const [total, setTotal]           = useState(0);
  const [tiers, setTiers]           = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [tab, setTab]               = useState('members');
  const [loading, setLoading]       = useState(true);
  const [editMemberTier, setEditMemberTier] = useState(null);
  const [processWd, setProcessWd]   = useState(null);
  const [saving, setSaving]         = useState(false);
  const [search, setSearch]         = useState('');
  const [page, setPage]             = useState(1);
  const [limit, setLimit]           = useState(20);

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (search) p.append('search', search);
    p.append('page', page);
    p.append('limit', limit);

    Promise.all([
      fetchJson(`${API}/affiliates?${p}`),
      fetchJson(`${API}/affiliates/configs`),
      fetchJson(`${API}/affiliates/withdrawals`),
    ]).then(([af, cfg, wd]) => {
      setAffiliates(Array.isArray(af) ? af : (af?.data || []));
      setTotal(af?.total || (Array.isArray(af) ? af.length : 0));
      setTiers(Array.isArray(cfg) ? cfg : (cfg?.data || []));
      setWithdrawals(Array.isArray(wd) ? wd : (wd?.data || []));
    }).catch(console.error).finally(() => setLoading(false));
  }, [search, page, limit]);

  useEffect(() => { load(); }, [load]);

  // Reset page on search
  useEffect(() => { setPage(1); }, [search, limit]);


  const processWithdrawal = (action) => {
    if (!processWd) return;
    setSaving(true);
    fetchJson(`${API}/affiliates/withdrawals/process`, {
      method: 'POST',
      body: JSON.stringify({ id: processWd.id, action, note: processWd.note || '' }),
    }).then(() => { load(); setProcessWd(null); })
      .catch(console.error).finally(() => setSaving(false));
  };

  const saveMemberTier = () => {
    if (!editMemberTier) return;
    setSaving(true);
    fetchJson(`${API}/affiliates/member/update-tier`, {
      method: 'POST',
      body: JSON.stringify({
        user_id: editMemberTier.id,
        membership_tier_id: parseInt(editMemberTier.new_tier_id),
        status: editMemberTier.new_status
      }),
    }).then(() => { load(); setEditMemberTier(null); })
      .catch(err => alert(_err.message || 'Gagal mengubah data member'))
      .finally(() => setSaving(false));
  };

  const pendingWd = withdrawals.filter(w => w.status === 'pending').length;
  const totalPages = Math.ceil(total / limit);

  return (
    <div style={A.page} className="fade-in">
      <PageHeader title="Affiliate Program" subtitle="Kelola anggota dan pencairan komisi afiliasi." />

      <StatRow stats={[
        { label: 'Total Affiliate', val: total, icon: 'bxs-group', color: '#6366f1' },
        { label: 'Aktif', val: affiliates.filter(a => a.affiliate_status === 'active').length, icon: 'bxs-check-circle', color: '#10b981' },
        { label: 'Pencairan Pending', val: pendingWd, icon: 'bxs-wallet', color: '#f59e0b' },
      ]} />

      {/* Tab Switch */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, background: '#f8fafc', padding: 6, borderRadius: 14, border: '1px solid #f1f5f9' }}>
        {[
          { val: 'members', label: 'Members' },
          { val: 'withdrawals', label: `Payouts${pendingWd > 0 ? ` (${pendingWd})` : ''}` },
        ].map(t => (
          <button key={t.val} style={{
            flex: '1 1 auto', textAlign: 'center',
            padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: 12,
            background: tab === t.val ? '#fff' : 'transparent',
            color: tab === t.val ? (t.val === 'withdrawals' && pendingWd > 0 ? '#f59e0b' : '#0f172a') : '#94a3b8',
            boxShadow: tab === t.val ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.15s',
          }} onClick={() => setTab(t.val)}>{t.label}</button>
        ))}
      </div>

      {/* ── MEMBERS TAB ──────────────────────────────────────────── */}
      {tab === 'members' && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <div style={{ ...A.searchWrap, minWidth: 300, flex: 1, position: 'relative' }}>
              <i className="bx bx-search" style={A.searchIcon} />
              <input style={{ ...A.searchInput, width: '100%', paddingLeft: 40, height: 42 }} placeholder="Cari Nama, Email, atau Ref Code..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <select style={{ ...A.select, height: 42, minWidth: 100 }} value={limit} onChange={e => setLimit(parseInt(e.target.value))}>
                <option value="20">20 / Hal</option>
                <option value="50">50 / Hal</option>
                <option value="100">100 / Hal</option>
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9' }}>
            <TablePanel loading={loading}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
                <thead>
                  <tr>
                    {['Member', 'Ref Code', 'Tier', 'Komisi', 'Saldo', 'Omzet Tim', 'Omzet Bulan', 'Aksi'].map((h, i) => (
                      <th key={h} style={{ ...A.th, paddingLeft: i === 0 ? 24 : 14, paddingRight: i === 7 ? 24 : 14 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
              <tbody>
                {affiliates.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
                    <i className="bx bxs-group" style={{ fontSize: 40, display: 'block', marginBottom: 8, opacity: 0.3 }} />
                    Belum ada member affiliate yang sesuai filter.
                  </td></tr>
                ) : affiliates.map((a, idx) => {
                  const tc = a.tier_color || '#94a3b8';
                  return (
                    <tr key={a.id}
                      style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f5f7ff'}
                      onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa'}
                    >
                      <td style={{ ...A.td, paddingLeft: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 10, background: `${tc}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tc, fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                            {(a.full_name || a.email || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13.5 }}>{a.full_name || '—'}</div>
                            <div style={{ fontSize: 11.5, color: '#94a3b8' }}>{a.email} <span style={{ fontSize: 10, color: '#6366f1', textTransform: 'uppercase', background: '#eef2ff', padding: '1px 4px', borderRadius: 4 }}>{a.role}</span></div>
                          </div>
                        </div>
                      </td>
                      <td style={A.td}>
                        <code style={{ fontSize: 12, background: '#f1f5f9', padding: '2px 8px', borderRadius: 6, color: '#6366f1' }}>{a.ref_code || '—'}</code>
                      </td>
                      <td style={A.td}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800, background: `${tc}18`, color: tc }}>
                          {a.tier_name || 'Mitra Dasar'}
                        </span>
                      </td>
                      <td style={A.td}><span style={{ fontWeight: 700, color: '#10b981' }}>{idr(a.total_earned || 0)}</span></td>
                      <td style={A.td}><span style={{ fontWeight: 700, color: '#6366f1' }}>{idr(a.balance || 0)}</span></td>
                      <td style={A.td}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{idr(a.team_turnover || 0)}</div>
                        <div style={{ fontSize: 10, color: '#94a3b8' }}>{a.team_downlines || 0} downlines</div>
                      </td>
                      <td style={A.td}><span style={{ fontWeight: 700, color: '#f59e0b' }}>{idr(a.monthly_turnover || 0)}</span></td>
                      <td style={{ ...A.td, paddingRight: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, ...(STATUS_BADGE[a.affiliate_status] || STATUS_BADGE['pending_verification']) }}>
                            {a.affiliate_status || 'pending'}
                          </span>
                          <button 
                            style={A.iconBtn('#6366f1', '#eef2ff')} 
                            title="Ubah Status/Tier"
                            onClick={() => setEditMemberTier({ ...a, new_tier_id: a.membership_tier_id || '', new_status: a.affiliate_status || '' })}
                          >
                            <i className="bx bx-edit-alt" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fcfcfd' }}>
              <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>
                Menampilkan <span style={{ color: '#475569' }}>{affiliates.length}</span> dari <span style={{ color: '#475569' }}>{total}</span> member
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} style={{ ...A.btnGhost, padding: '8px 12px', opacity: page === 1 ? 0.5 : 1 }}>
                  <i className="bx bx-chevron-left" />
                </button>
                <div style={{ padding: '0 12px', fontSize: 13, fontWeight: 800, color: '#6366f1' }}>{page} / {totalPages || 1}</div>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ ...A.btnGhost, padding: '8px 12px', opacity: page >= totalPages ? 0.5 : 1 }}>
                  <i className="bx bx-chevron-right" />
                </button>
              </div>
            </div>
          </TablePanel>
          </div>
        </>
      )}


      {/* ── WITHDRAWALS TAB ────────────────────────────────────────── */}
      {tab === 'withdrawals' && (
        <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9' }}>
          <TablePanel loading={loading}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 850 }}>
              <thead>
                <tr>
                  {['Affiliate', 'Jumlah', 'Bank', 'Status', 'Tanggal', 'Aksi'].map((h, i) => (
                    <th key={h} style={{ ...A.th, paddingLeft: i === 0 ? 24 : 14, paddingRight: i === 5 ? 24 : 14, textAlign: i === 5 ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {withdrawals.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
                    <i className="bx bxs-wallet" style={{ fontSize: 40, display: 'block', marginBottom: 8, opacity: 0.3 }} />
                    Belum ada permintaan pencairan.
                  </td></tr>
                ) : withdrawals.map((w, idx) => (
                  <tr key={w.id}
                    style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f5f7ff'}
                    onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa'}
                  >
                    <td style={{ ...A.td, paddingLeft: 24 }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13.5 }}>{w.full_name || w.email}</div>
                      <div style={{ fontSize: 11.5, color: '#94a3b8' }}>{w.ref_code}</div>
                    </td>
                    <td style={A.td}><span style={{ fontWeight: 800, color: '#10b981', fontSize: 15 }}>{idr(w.amount)}</span></td>
                    <td style={A.td}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{w.bank_name}</div>
                      <div style={{ fontSize: 11.5, color: '#64748b' }}>{w.account_number} — {w.account_name}</div>
                    </td>
                    <td style={A.td}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, ...(STATUS_BADGE[w.status] || {}) }}>
                        {w.status}
                      </span>
                    </td>
                    <td style={{ ...A.td, fontSize: 12, color: '#94a3b8' }}>{fmtDate(w.created_at)}</td>
                    <td style={{ ...A.td, paddingRight: 24, textAlign: 'right' }}>
                      {w.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button style={{ ...A.iconBtn('#10b981', '#dcfce7'), padding: '6px 14px', fontSize: 12, fontWeight: 700, borderRadius: 8 }}
                            onClick={() => setProcessWd({ ...w, note: '' })}>
                            <i className="bx bx-check" /> Proses
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11.5, color: '#94a3b8' }}>{w.processed_at ? fmtDate(w.processed_at) : '—'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TablePanel>
        </div>
      )}


      {/* ── MODAL: Process Withdrawal ─────────────────────────────── */}
      {processWd && (
        <Modal title="Proses Permintaan Pencairan" onClose={() => setProcessWd(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#f8fafc', borderRadius: 14, padding: '16px 20px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Affiliate</div>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>{processWd.full_name || processWd.email}</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>{processWd.ref_code}</div>
            </div>
            <div style={{ background: '#f0fdf4', borderRadius: 14, padding: '16px 20px', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Jumlah Pencairan</div>
              <div style={{ fontWeight: 900, fontSize: 22, color: '#16a34a' }}>{idr(processWd.amount)}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                {processWd.bank_name} — {processWd.account_number} ({processWd.account_name})
              </div>
            </div>
            <div>
              <FieldLabel>Catatan (opsional)</FieldLabel>
              <textarea style={{ ...A.select, width: '100%', minHeight: 80, paddingTop: 10 }}
                placeholder="Contoh: Sudah ditransfer via BRI..."
                value={processWd.note}
                onChange={e => setProcessWd(p => ({ ...p, note: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 20 }}>
            <button style={{ ...A.btnGhost, color: '#ef4444', border: '1px solid #fecaca' }}
              onClick={() => processWithdrawal('reject')} disabled={saving}>
              <i className="bx bx-x-circle" /> Tolak
            </button>
            <button style={{ ...A.btnPrimary, background: 'linear-gradient(135deg,#10b981,#059669)' }}
              onClick={() => processWithdrawal('approve')} disabled={saving}>
              {saving ? '...' : <><i className="bx bx-check-circle" /> Approve</>}
            </button>
          </div>
        </Modal>
      )}

      {/* ── MODAL: Edit Member Tier ─────────────────────────────── */}
      {editMemberTier && (
        <Modal title="Ubah Level Member" onClose={() => setEditMemberTier(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#f8fafc', borderRadius: 14, padding: '16px 20px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Member</div>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>{editMemberTier.full_name || editMemberTier.email}</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>Tier Saat Ini: <span style={{ color: '#6366f1', fontWeight: 700 }}>{editMemberTier.tier_name || 'Mitra Dasar'}</span></div>
            </div>

            <div>
              <FieldLabel>Pilih Tier Baru</FieldLabel>
              <select 
                style={{ ...A.select, width: '100%' }}
                value={editMemberTier.new_tier_id}
                onChange={e => setEditMemberTier(p => ({ ...p, new_tier_id: e.target.value }))}
              >
                <option value="">-- Pilih Tier --</option>
                {tiers.map(t => (
                  <option key={t.id} value={t.id}>{t.name} (Level {t.level})</option>
                ))}
              </select>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                * Perubahan tier akan langsung mempengaruhi rate komisi member ini pada transaksi berikutnya.
              </div>
            </div>

            <div>
              <FieldLabel>Status Member</FieldLabel>
              <select 
                style={{ ...A.select, width: '100%' }}
                value={editMemberTier.new_status}
                onChange={e => setEditMemberTier(p => ({ ...p, new_status: e.target.value }))}
              >
                <option value="active">Active (Telah Valid)</option>
                <option value="pending_verification">Pending Verification (Blm Valid)</option>
                <option value="suspended">Suspended (Ditangguhkan)</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 24 }}>
            <button onClick={() => setEditMemberTier(null)} style={A.btnGhost}>Batal</button>
            <button 
              onClick={saveMemberTier} 
              disabled={saving || !editMemberTier.new_tier_id} 
              style={A.btnPrimary}
            >
              {saving ? '...' : <><i className="bx bx-save" /> Simpan Perubahan</>}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
