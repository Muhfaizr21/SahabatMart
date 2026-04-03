import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';

const API = ADMIN_API_BASE;

const S = {
  page: { fontFamily: "'Inter', sans-serif", paddingTop: 20 },
  card: { background: '#fff', borderRadius: 16, border: '1px solid #f0f0f5', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' },
  cardHeader: { padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  thCell: { padding: '11px 16px', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.6px', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', whiteSpace: 'nowrap' },
  tdCell: { padding: '14px 16px', borderBottom: '1px solid #f8fafc', verticalAlign: 'middle' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050 },
  modalBox: { background: '#fff', borderRadius: 20, width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', overflow: 'hidden' },
  label: { display: 'block', fontSize: 11.5, fontWeight: 700, color: '#64748b', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: 5 },
  select: { width: '100%', padding: '10px 13px', borderRadius: 9, border: '1.5px solid #e2e8f0', fontSize: 13.5, color: '#334155', background: '#f8fafc', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  textarea: { width: '100%', padding: '10px 13px', borderRadius: 9, border: '1.5px solid #e2e8f0', fontSize: 13.5, color: '#334155', background: '#f8fafc', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' },
};

const STATUS_MAP = {
  open:             { bg: '#ffe4e6', color: '#9f1239', dot: '#f43f5e', label: 'Terbuka' },
  pending:          { bg: '#fef3c7', color: '#92400e', dot: '#f59e0b', label: 'Menunggu Bukti' },
  refund_approved:  { bg: '#d1fae5', color: '#065f46', dot: '#10b981', label: 'Refund Disetujui' },
  rejected:         { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8', label: 'Ditolak' },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_MAP[status] || STATUS_MAP.open;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: s.bg, color: s.color, fontSize: 12, fontWeight: 600 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
      {s.label}
    </span>
  );
};

export default function AdminDisputes() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [decision, setDecision] = useState({ status: 'refund_approved', note: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    fetchJson(`${API}/disputes`)
      .then(d => setDisputes(d.data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleArbitrate = () => {
    if (!selected) return;
    setSubmitting(true);
    fetch(`${API}/disputes/arbitrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selected.id, status: decision.status, decision_note: decision.note, decided_by: 'admin-super' }),
    }).then(() => {
      load();
      setSelected(null);
      setDecision({ status: 'refund_approved', note: '' });
    }).finally(() => setSubmitting(false));
  };

  const openCount = disputes.filter(d => d.status === 'open').length;

  return (
    <div style={S.page} className="fade-in">
      {/* Breadcrumb */}
      <div className="d-none d-sm-flex align-items-center gap-2 mb-4">
        <span style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Dispute Center</span>
        <i className="bx bx-chevron-right" style={{ color: '#cbd5e1', fontSize: 20 }} />
        <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 500 }}>Arbitrasi Sengketa</span>
      </div>

      {/* Alert Banner jika ada dispute open */}
      {openCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 12, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#ffe4e6', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
            <i className="bx bx-error-circle" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#9f1239' }}>
              {openCount} Sengketa Memerlukan Arbitrasi
            </div>
            <div style={{ fontSize: 13, color: '#be123c', marginTop: 2 }}>
              Tindakan admin diperlukan untuk menyelesaikan sengketa yang masih terbuka.
            </div>
          </div>
          <span style={{ padding: '4px 14px', borderRadius: 20, background: '#ffe4e6', color: '#be123c', fontSize: 13, fontWeight: 700, border: '1px solid #fecdd3' }}>
            {openCount} Open
          </span>
        </div>
      )}

      <div style={S.card}>
        <div style={S.cardHeader}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Daftar Sengketa</div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>{disputes.length} sengketa tercatat</div>
          </div>
          <button onClick={load} style={{ width: 36, height: 36, borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 19 }}>
            <i className="bx bx-refresh" />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div className="spinner-border" style={{ color: '#4361ee', width: 32, height: 32, borderWidth: 3 }} />
            <div style={{ marginTop: 12, fontSize: 13, color: '#94a3b8' }}>Memuat sengketa...</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
              <thead>
                <tr>
                  {[['Order ID', 'left', 24], ['Alasan Sengketa', 'left', 16], ['Pembeli', 'left', 16], ['Status', 'left', 16], ['Tanggal', 'left', 16], ['Aksi', 'right', 24]].map(([h, align, pl]) => (
                    <th key={h} style={{ ...S.thCell, textAlign: align, paddingLeft: pl, paddingRight: h === 'Aksi' ? 24 : 16 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {disputes.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '64px 0', color: '#94a3b8' }}>
                      <i className="bx bx-check-shield" style={{ fontSize: 48, display: 'block', marginBottom: 12, opacity: 0.3 }} />
                      <div style={{ fontWeight: 600, fontSize: 15, color: '#475569', marginBottom: 6 }}>Tidak ada sengketa</div>
                      <div style={{ fontSize: 13 }}>Semua transaksi berjalan lancar tanpa konflik.</div>
                    </td>
                  </tr>
                ) : disputes.map((d, idx) => (
                  <tr key={d.id}
                    style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                    onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa'}
                  >
                    <td style={{ ...S.tdCell, paddingLeft: 24 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 13.5, fontWeight: 700, color: '#4361ee' }}>
                        #{d.order_id?.slice(0, 8).toUpperCase()}
                      </span>
                    </td>
                    <td style={S.tdCell}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a', maxWidth: 220 }}>{d.reason}</div>
                    </td>
                    <td style={S.tdCell}>
                      <span style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>
                        #{d.buyer_id?.slice(0, 8)}
                      </span>
                    </td>
                    <td style={S.tdCell}>
                      <StatusBadge status={d.status} />
                    </td>
                    <td style={S.tdCell}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                        {new Date(d.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td style={{ ...S.tdCell, paddingRight: 24, textAlign: 'right' }}>
                      {d.status === 'open' ? (
                        <button onClick={() => setSelected(d)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, border: 'none', background: '#fff1f2', color: '#be123c', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                          <i className="bx bx-gavel" style={{ fontSize: 16 }} /> Arbitrasi
                        </button>
                      ) : (
                        <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Selesai</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Arbitration Modal */}
      {selected && (
        <div style={S.modalOverlay} onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div style={S.modalBox}>
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fff1f2', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                  <i className="bx bx-gavel" />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Panel Arbitrasi</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>Order #{selected.order_id?.slice(0, 8).toUpperCase()}</div>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 22 }}>
                <i className="bx bx-x" />
              </button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              {/* Case Summary */}
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 16px', marginBottom: 20, borderLeft: '3px solid #e11d48' }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>Alasan Sengketa</div>
                <div style={{ fontSize: 13.5, color: '#334155', fontWeight: 500 }}>{selected.reason}</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={S.label}>Keputusan Arbitrasi</label>
                  <select style={S.select} value={decision.status} onChange={e => setDecision({ ...decision, status: e.target.value })}>
                    <option value="refund_approved">✅ Setujui Refund — Uang kembali ke pembeli</option>
                    <option value="rejected">❌ Tolak Refund — Uang diteruskan ke penjual</option>
                    <option value="pending">⏳ Minta Bukti Tambahan</option>
                  </select>
                </div>
                <div>
                  <label style={S.label}>Catatan Keputusan (Wajib)</label>
                  <textarea style={{ ...S.textarea, minHeight: 90 }} rows={3} placeholder="Jelaskan alasan keputusan berdasarkan kebijakan platform..."
                    value={decision.note} onChange={e => setDecision({ ...decision, note: e.target.value })}
                    onFocus={e => e.target.style.borderColor = '#818cf8'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </div>
              </div>

              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', marginTop: 16, fontSize: 13, color: '#92400e', display: 'flex', gap: 8 }}>
                <i className="bx bx-info-circle" style={{ flexShrink: 0, marginTop: 1 }} />
                <span>Keputusan arbitrasi bersifat final dan akan langsung mempengaruhi saldo wallet pihak terkait.</span>
              </div>
            </div>

            <div style={{ padding: '0 24px 20px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setSelected(null)} style={{ padding: '9px 20px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
                Batal
              </button>
              <button onClick={handleArbitrate} disabled={!decision.note.trim() || submitting}
                style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: decision.note.trim() ? '#e11d48' : '#fca5a5', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: decision.note.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 7 }}>
                {submitting ? <div className="spinner-border spinner-border-sm" style={{ width: 16, height: 16 }} /> : <i className="bx bx-gavel" />}
                Kirim Keputusan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
