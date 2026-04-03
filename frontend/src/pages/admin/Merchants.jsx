import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';

const API = ADMIN_API_BASE;
const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

/* ─── Inline Styles ─────────────────────────────────────── */
const styles = {
  page: { fontFamily: "'Inter', sans-serif" },

  // KPI Cards
  kpiCard: {
    background: '#fff',
    borderRadius: 16,
    border: '1px solid #f0f0f5',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    transition: 'box-shadow 0.2s',
  },
  kpiIconBox: (color) => ({
    width: 52,
    height: 52,
    borderRadius: 14,
    background: color + '18',
    color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    fontSize: 26,
  }),
  kpiLabel: { fontSize: 12, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 4 },
  kpiValue: { fontSize: 28, fontWeight: 700, color: '#0f172a', lineHeight: 1 },

  // Table card
  tableCard: {
    background: '#fff',
    borderRadius: 16,
    border: '1px solid #f0f0f5',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  tableHeader: {
    padding: '20px 24px 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    borderBottom: '1px solid #f1f5f9',
    paddingBottom: 16,
  },
  tableTitle: { fontSize: 16, fontWeight: 700, color: '#0f172a' },
  tableSubtitle: { fontSize: 13, color: '#94a3b8', marginTop: 2 },

  // Search
  searchWrap: { position: 'relative', minWidth: 240 },
  searchInput: {
    width: '100%',
    paddingLeft: 38,
    paddingRight: 14,
    paddingTop: 9,
    paddingBottom: 9,
    borderRadius: 10,
    border: '1.5px solid #e2e8f0',
    fontSize: 13.5,
    color: '#334155',
    background: '#f8fafc',
    outline: 'none',
    transition: 'border 0.2s',
  },
  searchIcon: { position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 17 },

  // Filter tabs
  filterTab: (active) => ({
    padding: '7px 16px',
    borderRadius: 8,
    border: 'none',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s',
    background: active ? '#4361ee' : 'transparent',
    color: active ? '#fff' : '#64748b',
  }),

  // Table itself
  thead: { background: '#f8fafc' },
  thCell: {
    padding: '12px 16px',
    fontSize: 11,
    fontWeight: 700,
    color: '#94a3b8',
    letterSpacing: '0.6px',
    textTransform: 'uppercase',
    borderBottom: '1px solid #f1f5f9',
    whiteSpace: 'nowrap',
    background: '#f8fafc',
  },
  tdCell: {
    padding: '14px 16px',
    borderBottom: '1px solid #f8fafc',
    verticalAlign: 'middle',
  },

  // Merchant avatar
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: 'linear-gradient(135deg, #4361ee22, #7c3aed22)',
    border: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    color: '#4361ee',
    flexShrink: 0,
  },
  merchantName: { fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 3 },
  merchantId: { fontSize: 11.5, color: '#94a3b8', fontFamily: 'monospace', letterSpacing: '0.3px' },

  // Status badge
  badge: (type) => {
    const map = {
      active:    { bg: '#d1fae5', color: '#065f46', dot: '#10b981' },
      pending:   { bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
      suspended: { bg: '#ffe4e6', color: '#9f1239', dot: '#f43f5e' },
      banned:    { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8' },
    };
    const s = map[type] || map.banned;
    return {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 10px',
      borderRadius: 20,
      background: s.bg,
      color: s.color,
      fontSize: 12,
      fontWeight: 600,
      whiteSpace: 'nowrap',
      dot: s.dot,
    };
  },

  // Verified pill
  verifiedPill: (v) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '4px 10px',
    borderRadius: 20,
    background: v ? '#d1fae5' : '#f1f5f9',
    color: v ? '#065f46' : '#64748b',
    fontSize: 12,
    fontWeight: 600,
  }),

  // Currency
  currencyMain: { fontSize: 14, fontWeight: 700, color: '#0f172a' },
  currencyLabel: { fontSize: 11, color: '#94a3b8', marginTop: 2, fontWeight: 500 },

  // Date
  dateMain: { fontSize: 13.5, fontWeight: 600, color: '#334155' },
  dateSub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },

  // Action buttons
  actionBtn: (variant) => {
    const map = {
      verify:    { bg: '#eff6ff', color: '#2563eb', hover: '#dbeafe' },
      unverify:  { bg: '#f1f5f9', color: '#64748b', hover: '#e2e8f0' },
      activate:  { bg: '#f0fdf4', color: '#16a34a', hover: '#dcfce7' },
      suspend:   { bg: '#fff1f2', color: '#e11d48', hover: '#ffe4e6' },
    };
    const s = map[variant];
    return {
      width: 34,
      height: 34,
      borderRadius: 9,
      border: 'none',
      background: s.bg,
      color: s.color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      fontSize: 17,
      transition: 'all 0.15s',
      flexShrink: 0,
    };
  },

  // Modal
  modalOverlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(15,23,42,0.45)',
    backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1050,
  },
  modalBox: {
    background: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 460,
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
    overflow: 'hidden',
  },
  modalHeader: {
    padding: '20px 24px 16px',
    borderBottom: '1px solid #f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
};

/* ─── Sub-components ──────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const s = styles.badge(status);
  const label = { active: 'Aktif', pending: 'Pending', suspended: 'Suspended', banned: 'Banned' }[status] || status;
  return (
    <span style={s}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot, display: 'inline-block', flexShrink: 0 }} />
      {label}
    </span>
  );
};

const VerifiedBadge = ({ verified }) => (
  <span style={styles.verifiedPill(verified)}>
    <i className={`bx ${verified ? 'bxs-check-circle' : 'bx-x-circle'}`} style={{ fontSize: 14 }} />
    {verified ? 'Verified' : 'Unverified'}
  </span>
);

const KpiCard = ({ label, value, color, icon, sub }) => (
  <div style={styles.kpiCard}>
    <div style={styles.kpiIconBox(color)}>
      <i className={`bx ${icon}`} />
    </div>
    <div>
      <div style={styles.kpiLabel}>{label}</div>
      <div style={styles.kpiValue}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3 }}>{sub}</div>}
    </div>
  </div>
);

/* ─── Main Component ──────────────────────────────────────── */
const FILTER_TABS = [
  { value: '', label: 'Semua' },
  { value: 'active', label: 'Aktif' },
  { value: 'pending', label: 'Pending' },
  { value: 'suspended', label: 'Suspended' },
];

export default function AdminMerchants() {
  const [merchants, setMerchants] = useState([]);
  const [stats, setStats]         = useState({});
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch]        = useState('');
  const [loading, setLoading]      = useState(true);
  const [selected, setSelected]    = useState(null);
  const [actionNote, setActionNote] = useState('');
  const [error, setError]          = useState('');

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.append('status', filterStatus);
    if (search)       params.append('search', search);

    Promise.all([
      fetchJson(API + '/merchants?' + params),
      fetchJson(API + '/merchants/stats'),
    ]).then(([list, s]) => {
      setMerchants(list.data || []);
      setStats(s || {});
      setError('');
    }).catch((err) => {
      setError(err.message || 'Gagal memuat data merchant');
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterStatus]);

  const updateStatus = (merchantId, status, note = '') => {
    fetchJson(API + '/merchants/status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchant_id: merchantId, status, suspend_note: note }),
    }).then(() => { load(); setSelected(null); });
  };

  const verify = (merchantId, verified) => {
    fetchJson(API + '/merchants/verify', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchant_id: merchantId, verified }),
    }).then(() => load());
  };

  return (
    <div style={styles.page} className="fade-in">

      {/* Breadcrumb */}
      <div className="d-none d-sm-flex align-items-center gap-2 mb-4">
        <span style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Merchant Management</span>
        <i className="bx bx-chevron-right" style={{ color: '#cbd5e1', fontSize: 20 }} />
        <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 500 }}>Daftar Toko</span>
      </div>

      {error && (
        <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c', borderRadius: 12, padding: '12px 16px', fontSize: 13.5, marginBottom: 20 }}>
          <i className="bx bx-error-circle me-2" />
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Total Merchant', val: stats.total || 0, color: '#4361ee', icon: 'bx-store', sub: 'Terdaftar di platform' },
          { label: 'Aktif',         val: stats.active || 0, color: '#10b981', icon: 'bx-check-circle', sub: 'Beroperasi normal' },
          { label: 'Menunggu',      val: stats.pending || 0, color: '#f59e0b', icon: 'bx-time-five', sub: 'Perlu verifikasi' },
          { label: 'Disuspend',     val: stats.suspended || 0, color: '#f43f5e', icon: 'bx-block', sub: 'Akses dibatasi' },
        ].map(s => (
          <div key={s.label} className="col-12 col-sm-6 col-xl-3">
            <KpiCard label={s.label} value={s.val} color={s.color} icon={s.icon} sub={s.sub} />
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div style={styles.tableCard}>

        {/* Card Header */}
        <div style={styles.tableHeader}>
          <div>
            <div style={styles.tableTitle}>Daftar Toko</div>
            <div style={styles.tableSubtitle}>{merchants.length} merchant ditemukan</div>
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            {/* Search */}
            <div style={styles.searchWrap}>
              <i className="bx bx-search" style={styles.searchIcon} />
              <input
                type="search"
                style={styles.searchInput}
                placeholder="Cari merchant..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && load()}
              />
            </div>

            {/* Refresh */}
            <button onClick={load} style={{ ...styles.actionBtn('verify'), width: 'auto', padding: '0 14px', fontSize: 13, fontWeight: 600, gap: 6, display: 'flex' }}>
              <i className="bx bx-refresh" style={{ fontSize: 18 }} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 4 }}>
          {FILTER_TABS.map(tab => (
            <button key={tab.value} onClick={() => setFilterStatus(tab.value)} style={styles.filterTab(filterStatus === tab.value)}>
              {tab.label}
              {tab.value === 'active' && stats.active > 0 && (
                <span style={{ marginLeft: 6, background: filterStatus === 'active' ? 'rgba(255,255,255,0.3)' : '#e2e8f0', borderRadius: 10, padding: '0 6px', fontSize: 11 }}>
                  {stats.active}
                </span>
              )}
              {tab.value === 'pending' && stats.pending > 0 && (
                <span style={{ marginLeft: 6, background: filterStatus === 'pending' ? 'rgba(255,255,255,0.3)' : '#fef3c7', color: '#92400e', borderRadius: 10, padding: '0 6px', fontSize: 11 }}>
                  {stats.pending}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div className="spinner-border" style={{ color: '#4361ee', width: 32, height: 32, borderWidth: 3 }} />
            <div style={{ marginTop: 12, fontSize: 13, color: '#94a3b8' }}>Memuat data merchant...</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}>
              <thead>
                <tr>
                  {['Toko', 'Status', 'Verifikasi', 'Saldo Wallet', 'Total Penjualan', 'Bergabung', 'Aksi'].map((h, i) => (
                    <th key={h} style={{ ...styles.thCell, textAlign: i === 6 ? 'right' : 'left', paddingLeft: i === 0 ? 24 : 16, paddingRight: i === 6 ? 24 : 16 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {merchants.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '64px 0', color: '#94a3b8' }}>
                      <i className="bx bx-store" style={{ fontSize: 48, display: 'block', marginBottom: 12, opacity: 0.3 }} />
                      <div style={{ fontWeight: 600, fontSize: 15, color: '#475569', marginBottom: 6 }}>Belum ada merchant</div>
                      <div style={{ fontSize: 13 }}>Tidak ada toko yang sesuai dengan filter yang dipilih.</div>
                    </td>
                  </tr>
                ) : merchants.map((m, idx) => (
                  <tr key={m.id}
                    style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0f7ff'}
                    onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa'}
                  >
                    {/* Toko */}
                    <td style={{ ...styles.tdCell, paddingLeft: 24 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={styles.avatar}>
                          <i className="bx bx-store-alt" />
                        </div>
                        <div>
                          <div style={styles.merchantName}>{m.store_name}</div>
                          <div style={styles.merchantId}>#{m.id.slice(0, 8).toUpperCase()}</div>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td style={styles.tdCell}>
                      <StatusBadge status={m.status} />
                    </td>

                    {/* Verified */}
                    <td style={styles.tdCell}>
                      <VerifiedBadge verified={m.is_verified} />
                    </td>

                    {/* Wallet Balance */}
                    <td style={styles.tdCell}>
                      <div style={styles.currencyMain}>{fmt(m.balance)}</div>
                      <div style={styles.currencyLabel}>Saldo tersedia</div>
                    </td>

                    {/* Gross Sales */}
                    <td style={styles.tdCell}>
                      <div style={styles.currencyMain}>{fmt(m.total_sales)}</div>
                      <div style={styles.currencyLabel}>Lifetime</div>
                    </td>

                    {/* Joined */}
                    <td style={styles.tdCell}>
                      <div style={styles.dateMain}>
                        {m.joined_at ? new Date(m.joined_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </div>
                      <div style={styles.dateSub}>
                        {m.joined_at ? new Date(m.joined_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ ...styles.tdCell, paddingRight: 24 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                        <button
                          style={styles.actionBtn(m.is_verified ? 'unverify' : 'verify')}
                          onClick={() => verify(m.id, !m.is_verified)}
                          title={m.is_verified ? 'Cabut Verifikasi' : 'Verifikasi Merchant'}
                          onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                        >
                          <i className={`bx ${m.is_verified ? 'bxs-check-shield' : 'bx-shield'}`} />
                        </button>

                        {m.status !== 'active' && (
                          <button
                            style={styles.actionBtn('activate')}
                            onClick={() => updateStatus(m.id, 'active')}
                            title="Aktifkan Merchant"
                            onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                          >
                            <i className="bx bx-play-circle" />
                          </button>
                        )}

                        <button
                          style={styles.actionBtn('suspend')}
                          onClick={() => setSelected(m)}
                          title="Suspend Merchant"
                          onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                        >
                          <i className="bx bx-block" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer */}
        {!loading && merchants.length > 0 && (
          <div style={{ padding: '12px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#94a3b8' }}>
              Menampilkan <strong style={{ color: '#475569' }}>{merchants.length}</strong> merchant
            </span>
            <span style={{ fontSize: 12, color: '#cbd5e1' }}>
              Terakhir diperbarui: {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>

      {/* Suspend Modal */}
      {selected && (
        <div style={styles.modalOverlay} onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div style={styles.modalBox}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fff1f2', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  <i className="bx bx-block" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>Suspend Merchant</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{selected.store_name}</div>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 20, lineHeight: 1 }}>
                <i className="bx bx-x" />
              </button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#9a3412', display: 'flex', gap: 8 }}>
                <i className="bx bx-error-circle" style={{ flexShrink: 0, marginTop: 1 }} />
                <span>Tindakan ini akan membatasi akses merchant dan menyembunyikan produknya dari storefront.</span>
              </div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 8 }}>
                Alasan Suspend
              </label>
              <textarea
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13.5, color: '#334155', background: '#f8fafc', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                rows={3}
                value={actionNote}
                onChange={e => setActionNote(e.target.value)}
                placeholder="Contoh: Pelanggaran ToS, produk terlarang..."
              />
            </div>

            <div style={{ padding: '0 24px 20px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelected(null)}
                style={{ padding: '9px 20px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
              >
                Batal
              </button>
              <button
                onClick={() => { updateStatus(selected.id, 'suspended', actionNote); setActionNote(''); }}
                disabled={!actionNote.trim()}
                style={{
                  padding: '9px 20px', borderRadius: 10, border: 'none',
                  background: actionNote.trim() ? '#e11d48' : '#fca5a5',
                  color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: actionNote.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', gap: 7,
                }}
              >
                <i className="bx bx-block" />
                Konfirmasi Suspend
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
