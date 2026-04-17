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

  const load = () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (filter) p.append('status', filter);
    if (search) p.append('search', search);
    Promise.all([
      fetchJson(`${API}/merchants?${p}`),
      fetchJson(`${API}/merchants/stats`),
    ]).then(([list, s]) => {
      setMerchants(list.data || []);
      setStats(s || {});
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

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

  const TABS = [
    { val: '', label: 'Semua' },
    { val: 'active', label: 'Aktif' },
    { val: 'pending', label: 'Pending' },
    { val: 'suspended', label: 'Suspend' },
  ];

  return (
    <div style={A.page} className="fade-in">
      <PageHeader title="Merchant Management" subtitle="Kelola, verifikasi, dan moderasi seluruh mitra toko platform.">
        <div style={A.searchWrap}>
          <i className="bx bx-search" style={A.searchIcon} />
          <input
            style={A.searchInput}
            placeholder="Cari nama toko..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
          />
        </div>
        <button style={A.btnGhost} onClick={load}><i className="bx bx-refresh" /> Refresh</button>
      </PageHeader>

      <StatRow stats={[
        { label: 'Total Merchant', val: stats.total || 0, icon: 'bxs-store-alt', color: '#6366f1' },
        { label: 'Aktif', val: stats.active || 0, icon: 'bxs-badge-check', color: '#10b981' },
        { label: 'Pending', val: stats.pending || 0, icon: 'bxs-hourglass', color: '#f59e0b' },
        { label: 'Suspended', val: stats.suspended || 0, icon: 'bxs-shield-x', color: '#ef4444' },
      ]} />

      <TablePanel
        loading={loading}
        tabs={TABS.map(t => (
          <button key={t.val} style={A.tab(filter === t.val)} onClick={() => setFilter(t.val)}>{t.label}</button>
        ))}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
          <thead>
            <tr>
              {['Toko', 'Status', 'Verifikasi', 'Finansial', 'Bergabung', 'Aksi'].map((h, i) => (
                <th key={h} style={{ ...A.th, textAlign: i === 5 ? 'right' : 'left', paddingLeft: i === 0 ? 24 : 16, paddingRight: i === 5 ? 24 : 16 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {merchants.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
                <i className="bx bx-store" style={{ fontSize: 40, display: 'block', marginBottom: 8, opacity: 0.3 }} />
                Tidak ada merchant ditemukan.
              </td></tr>
            ) : merchants.map((m, idx) => (
              <tr key={m.id}
                style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f5f7ff'}
                onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa'}
              >
                <td style={{ ...A.td, paddingLeft: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className="bx bxs-store-alt" style={{ color: '#6366f1', fontSize: 18 }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{m.store_name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>#{m.id?.slice(0, 8).toUpperCase()}</div>
                    </div>
                  </div>
                </td>
                <td style={A.td}><span style={statusBadge(m.status)}>{m.status}</span></td>
                <td style={A.td}>
                  <span style={m.is_verified ? statusBadge('verified') : { ...statusBadge('draft'), color: '#64748b' }}>
                    <i className={`bx ${m.is_verified ? 'bxs-check-circle' : 'bx-circle'}`} style={{ fontSize: 13 }} />
                    {m.is_verified ? 'Verified' : 'Unverified'}
                  </span>
                </td>
                <td style={A.td}>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13.5 }}>{idr(m.balance)}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Sales: {idr(m.total_sales)}</div>
                </td>
                <td style={A.td}><span style={{ fontSize: 13 }}>{fmtDate(m.joined_at)}</span></td>
                <td style={{ ...A.td, paddingRight: 24, textAlign: 'right' }}>
                  <button
                    style={A.iconBtn('#6366f1', '#eef2ff')}
                    onClick={() => { setModal(m); setNote(''); }}
                    title="Kelola Merchant"
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
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Total Sales', val: idr(modal.total_sales) },
              { label: 'Wallet Balance', val: idr(modal.balance) },
              { label: 'Joined', val: fmtDate(modal.joined_at) },
            ].map(s => (
              <div key={s.label} style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Verification */}
          <div style={{ marginBottom: 20 }}>
            <FieldLabel>Verifikasi Toko</FieldLabel>
            <button
              onClick={() => toggleVerify(modal.id, modal.is_verified)}
              style={{ ...A.btnPrimary, background: modal.is_verified ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#6366f1,#4f46e5)', width: '100%', justifyContent: 'center', padding: '11px' }}
            >
              <i className={`bx ${modal.is_verified ? 'bxs-badge-check' : 'bx-badge'}`} />
              {modal.is_verified ? 'Cabut Verifikasi' : 'Terbitkan Verifikasi'}
            </button>
          </div>

          {/* Status */}
          <div style={{ marginBottom: 20 }}>
            <FieldLabel>Ubah Status Operasional</FieldLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
              {['active', 'pending', 'suspended'].map(s => (
                <button key={s}
                  onClick={() => updateStatus(modal.id, s)}
                  style={{
                    padding: '9px', borderRadius: 11, border: 'none', cursor: 'pointer',
                    fontWeight: 700, fontSize: 12, textTransform: 'uppercase',
                    background: modal.status === s
                      ? (s === 'active' ? '#10b981' : s === 'pending' ? '#f59e0b' : '#ef4444')
                      : '#f8fafc',
                    color: modal.status === s ? '#fff' : '#64748b',
                    transition: 'all 0.15s',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            <textarea
              style={{ ...A.textarea, minHeight: 80 }}
              placeholder="Catatan untuk suspend / pembatasan akses..."
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
