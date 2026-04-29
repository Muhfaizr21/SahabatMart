import React, { useState, useEffect, useCallback } from 'react';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';
import { PageHeader, StatRow, TablePanel, Modal, FieldLabel, statusBadge, idr, fmtDate, A } from '../../lib/adminStyles.jsx';

const API = ADMIN_API_BASE;

const TIER_COLORS = {
  Bronze:   '#cd7f32',
  Silver:   '#94a3b8',
  Gold:     '#f59e0b',
  Platinum: '#6366f1',
};

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
  const [editTier, setEditTier]     = useState(null);
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

  const saveTier = () => {
    if (!editTier) return;
    setSaving(true);
    fetchJson(`${API}/affiliates/config`, {
      method: 'POST',
      body: JSON.stringify(editTier),
    }).then(() => { load(); setEditTier(null); })
      .catch(console.error).finally(() => setSaving(false));
  };

  const processWithdrawal = (action) => {
    if (!processWd) return;
    setSaving(true);
    fetchJson(`${API}/affiliates/withdrawals/process`, {
      method: 'POST',
      body: JSON.stringify({ id: processWd.id, action, note: processWd.note || '' }),
    }).then(() => { load(); setProcessWd(null); })
      .catch(console.error).finally(() => setSaving(false));
  };

  const pendingWd = withdrawals.filter(w => w.status === 'pending').length;
  const totalPages = Math.ceil(total / limit);

  return (
    <div style={A.page} className="fade-in">
      <PageHeader title="Affiliate Program" subtitle="Kelola anggota, tier komisi, dan pencairan komisi afiliasi.">
        {tab === 'tiers' && (
          <button style={A.btnPrimary} onClick={() => setEditTier({ id: 0, tier_name: '', level: 1, comm_rate: 0.03, min_sales: 0, commission_hold_days: 7, is_active: true })}>
            <i className="bx bx-plus" /> Tambah Tier
          </button>
        )}
      </PageHeader>

      <StatRow stats={[
        { label: 'Total Affiliate', val: total, icon: 'bxs-group', color: '#6366f1' },
        { label: 'Aktif', val: affiliates.filter(a => a.affiliate_status === 'active').length, icon: 'bxs-check-circle', color: '#10b981' },
        { label: 'Pencairan Pending', val: pendingWd, icon: 'bxs-wallet', color: '#f59e0b' },
        { label: 'Konfigurasi Tier', val: tiers.length, icon: 'bxs-layer', color: '#8b5cf6' },
      ]} />

      {/* Tab Switch */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, background: '#f8fafc', padding: 6, borderRadius: 14, border: '1px solid #f1f5f9' }}>
        {[
          { val: 'members', label: 'Members' },
          { val: 'tiers', label: 'Tiers' },
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
                  const tc = TIER_COLORS[a.tier_name] || '#94a3b8';
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
                          {a.tier_name || 'Bronze'}
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
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, ...(STATUS_BADGE[a.affiliate_status] || STATUS_BADGE['pending_verification']) }}>
                          {a.affiliate_status || 'pending'}
                        </span>
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

      {/* ── TIERS TAB ──────────────────────────────────────────────── */}
      {tab === 'tiers' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {tiers.length === 0 && !loading && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              <i className="bx bxs-layer" style={{ fontSize: 40, display: 'block', marginBottom: 8, opacity: 0.3 }} />
              Belum ada konfigurasi tier. Klik "Tambah Tier" untuk mulai.
            </div>
          )}
          {tiers.map(t => {
            const tc = TIER_COLORS[t.name] || '#94a3b8';
            return (
              <div key={t.id} style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ height: 5, background: tc }} />
                <div style={{ padding: '20px 22px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: tc }}>{t.name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Level {t.level}</div>
                    </div>
                    <button style={A.iconBtn(tc, `${tc}14`)} onClick={() => setEditTier({ ...t, tier_name: t.name, comm_rate: t.base_commission_rate, min_sales: t.min_earnings_upgrade })} title="Edit">
                      <i className="bx bx-pencil" />
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { label: 'Komisi Dasar', val: `${((t.base_commission_rate || 0) * 100).toFixed(1)}%`, color: '#10b981' },
                      { label: 'Min. Earnings Upgrade', val: idr(t.min_earnings_upgrade || 0) },
                      { label: 'Hold Period', val: `${t.commission_hold_days || 7} hari` },
                    ].map(r => (
                      <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12.5, color: '#94a3b8', fontWeight: 500 }}>{r.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: r.color || '#0f172a' }}>{r.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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

      {/* ── MODAL: Edit Tier ────────────────────────────────────────── */}
      {editTier && (
        <Modal title={`${editTier.id === 0 ? 'Tambah' : 'Edit'} Tier Komisi`} onClose={() => setEditTier(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <FieldLabel>Nama Tier</FieldLabel>
              <select style={{ ...A.select, width: '100%' }} value={editTier.tier_name}
                onChange={e => setEditTier(p => ({ ...p, tier_name: e.target.value }))}>
                <option value="">— Pilih Tier —</option>
                {['Bronze', 'Silver', 'Gold', 'Platinum'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>Level (urutan)</FieldLabel>
              <input type="number" min="1" style={{ ...A.select, width: '100%' }}
                value={editTier.level}
                onChange={e => setEditTier(p => ({ ...p, level: parseInt(e.target.value) || 1 }))} />
            </div>
            <div>
              <FieldLabel>Komisi Dasar (%)</FieldLabel>
              <input type="number" step="0.1" min="0" max="100" style={{ ...A.select, width: '100%' }}
                value={(editTier.comm_rate * 100).toFixed(1)}
                onChange={e => setEditTier(p => ({ ...p, comm_rate: parseFloat(e.target.value) / 100 }))} />
            </div>
            <div>
              <FieldLabel>Min. Earnings Upgrade (Rp)</FieldLabel>
              <input type="number" min="0" style={{ ...A.select, width: '100%' }}
                value={editTier.min_sales}
                onChange={e => setEditTier(p => ({ ...p, min_sales: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <FieldLabel>Hold Period (hari)</FieldLabel>
              <input type="number" min="1" style={{ ...A.select, width: '100%' }}
                value={editTier.commission_hold_days || 7}
                onChange={e => setEditTier(p => ({ ...p, commission_hold_days: parseInt(e.target.value) || 7 }))} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 20 }}>
            <button onClick={() => setEditTier(null)} style={A.btnGhost}>Batal</button>
            <button onClick={saveTier} disabled={saving} style={A.btnPrimary}>
              {saving ? '...' : <><i className="bx bx-save" /> Simpan</>}
            </button>
          </div>
        </Modal>
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
    </div>
  );
}
