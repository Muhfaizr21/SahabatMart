import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson, formatPaymentMethod } from '../../lib/api';

const API = ADMIN_API_BASE;

// ── SHIPPING ACTION MODAL (Admin version) ─────────────────────────────────────
function ShippingActionModal({ group, onClose, onSuccess }) {
  const [tab, setTab] = useState('biteship');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [courierCode, setCourierCode] = useState('');
  const [result, setResult] = useState(null);

  const KURIR_OPTIONS = [
    { value: 'jne', label: 'JNE' },
    { value: 'jnt', label: 'J&T Express' },
    { value: 'sicepat', label: 'SiCepat' },
    { value: 'anteraja', label: 'AnterAja' },
    { value: 'ninja', label: 'Ninja Xpress' },
    { value: 'lion', label: 'Lion Parcel' },
    { value: 'sap', label: 'SAP Express' },
    { value: 'pos', label: 'Pos Indonesia' },
    { value: 'tiki', label: 'TIKI' },
    { value: 'wahana', label: 'Wahana' },
    { value: 'other', label: 'Kurir Lainnya' },
  ];

  const handleBiteshipGenerate = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetchJson(`${ADMIN_API_BASE}/orders/generate-label`, {
        method: 'POST',
        body: JSON.stringify({ group_id: group.id }),
      });
      setResult(res);
      onSuccess?.(res);
    } catch (err) {
      setError(err.message || 'Gagal generate resi via Biteship.');
    } finally { setLoading(false); }
  };

  const handleManualSubmit = async () => {
    if (!trackingNumber.trim()) { setError('Nomor resi tidak boleh kosong'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetchJson(`${ADMIN_API_BASE}/orders/manual-tracking`, {
        method: 'POST',
        body: JSON.stringify({ group_id: group.id, tracking_number: trackingNumber.trim(), courier_code: courierCode }),
      });
      setResult({ ...res, tracking_number: trackingNumber.trim(), courier_code: courierCode });
      onSuccess?.(res);
    } catch (err) {
      setError(err.message || 'Gagal menyimpan nomor resi');
    } finally { setLoading(false); }
  };

  const handlePrintPackingSlip = () => {
    window.open(`/packing-slip/${group.id}?role=admin`, '_blank');
  };

  const hasTracking = result?.tracking_number || group?.tracking_number;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 28, width: '100%', maxWidth: 520, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.2)' }}>
        {/* Header */}
        <div style={{ padding: '24px 32px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#0F172A' }}>🚚 Kelola Resi Pengiriman</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
              Toko: <b>{group?.merchant?.store_name || 'Merchant'}</b> · #{(group?.id || '').slice(0, 8).toUpperCase()}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#94A3B8', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Already has tracking */}
        {(group?.tracking_number || result?.tracking_number) && (
          <div style={{ margin: '20px 32px', padding: '16px 20px', background: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)', borderRadius: 16, border: '1px solid #86EFAC' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#15803D', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>✅ Resi Aktif</div>
            <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 900, color: '#0F172A', letterSpacing: 2 }}>
              {result?.tracking_number || group?.tracking_number}
            </div>
            {(result?.courier_code || group?.courier_code) && (
              <div style={{ fontSize: 12, color: '#16A34A', marginTop: 4, fontWeight: 700, textTransform: 'uppercase' }}>
                Kurir: {result?.courier_code || group?.courier_code}
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #F1F5F9', background: '#FAFBFF' }}>
          {[['biteship', '⚡ Biteship Otomatis'], ['manual', '✏️ Input Manual']].map(([val, label]) => (
            <button key={val} onClick={() => { setTab(val); setError(''); }}
              style={{ flex: 1, padding: '14px 0', fontSize: 13, fontWeight: tab === val ? 800 : 600, color: tab === val ? '#6366F1' : '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', borderBottom: tab === val ? '3px solid #6366F1' : '3px solid transparent', transition: 'all 0.2s' }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ padding: '24px 32px' }}>
          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#DC2626', fontWeight: 600 }}>
              ⚠️ {error}
            </div>
          )}

          {tab === 'biteship' && (
            <div>
              <p style={{ fontSize: 13, color: '#64748B', marginBottom: 20, lineHeight: 1.6 }}>
                Generate resi otomatis melalui integrasi Biteship. Nomor resi akan langsung tersimpan ke pesanan ini.
              </p>
              <button onClick={handleBiteshipGenerate} disabled={loading}
                style={{ width: '100%', padding: '14px', borderRadius: 14, background: loading ? '#E2E8F0' : 'linear-gradient(135deg, #6366F1, #818CF8)', color: '#fff', fontWeight: 800, fontSize: 14, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                {loading ? <><i className="bx bx-loader-alt bx-spin" /> Menghubungi Biteship...</> : <><i className="bx bx-barcode" /> Generate Resi via Biteship</>}
              </button>
            </div>
          )}

          {tab === 'manual' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'block' }}>Kurir</label>
                <select value={courierCode} onChange={e => setCourierCode(e.target.value)}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontSize: 13, fontWeight: 600, color: '#1E293B', background: '#FAFBFF', outline: 'none' }}>
                  <option value="">-- Pilih Kurir --</option>
                  {KURIR_OPTIONS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'block' }}>Nomor Resi *</label>
                <input value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)}
                  placeholder="Contoh: JNE123456789" style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontSize: 14, fontFamily: 'monospace', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <button onClick={handleManualSubmit} disabled={loading}
                style={{ width: '100%', padding: '14px', borderRadius: 14, background: loading ? '#E2E8F0' : 'linear-gradient(135deg, #0891B2, #06B6D4)', color: '#fff', fontWeight: 800, fontSize: 14, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                {loading ? <><i className="bx bx-loader-alt bx-spin" /> Menyimpan...</> : <><i className="bx bx-save" /> Simpan Nomor Resi</>}
              </button>
            </div>
          )}

          {/* Print packing slip */}
          {hasTracking && (
            <button onClick={handlePrintPackingSlip}
              style={{ width: '100%', marginTop: 14, padding: '13px', borderRadius: 14, background: 'linear-gradient(135deg, #0F172A, #1E293B)', color: '#fff', fontWeight: 800, fontSize: 14, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <i className="bx bx-printer" style={{ fontSize: 18 }} /> Cetak Packing Slip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


const idr = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

const fmtDate = (d) => {
  if (!d) return '-';
  return new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const nextAllowedStatus = {
  pending_payment: ['paid', 'cancelled'],
  paid: ['processing', 'refund_requested'],
  processing: ['ready_to_ship', 'refund_requested'],
  ready_to_ship: ['shipped', 'refund_requested'],
  shipped: ['delivered', 'refund_requested'],
  delivered: ['completed', 'refund_requested'],
  refund_requested: ['refund_processing', 'paid'],
  refund_processing: ['refunded', 'paid'],
};

const STATUS_META = {
  pending_payment: { color: '#d97706', bg: '#fef3c7', label: 'Menunggu Pembayaran', icon: 'bx-time-five' },
  paid:            { color: '#2563eb', bg: '#dbeafe', label: 'Sudah Dibayar',        icon: 'bx-check-circle' },
  processing:      { color: '#7c3aed', bg: '#ede9fe', label: 'Diproses',             icon: 'bx-cog' },
  ready_to_ship:   { color: '#0891b2', bg: '#cffafe', label: 'Siap Kirim',           icon: 'bx-package' },
  shipped:         { color: '#6366f1', bg: '#eef2ff', label: 'Dalam Pengiriman',     icon: 'bx-cycling' },
  delivered:       { color: '#16a34a', bg: '#dcfce7', label: 'Terkirim',             icon: 'bx-map-pin' },
  completed:       { color: '#16a34a', bg: '#dcfce7', label: 'Selesai',              icon: 'bxs-badge-check' },
  cancelled:       { color: '#dc2626', bg: '#fee2e2', label: 'Dibatalkan',           icon: 'bx-x-circle' },
  refund_requested:{ color: '#ea580c', bg: '#ffedd5', label: 'Refund Diminta',       icon: 'bx-undo' },
  refund_processing:{ color: '#d97706', bg: '#fef3c7', label: 'Refund Diproses',    icon: 'bx-loader-alt' },
  refunded:        { color: '#0891b2', bg: '#cffafe', label: 'Direfund',             icon: 'bx-revision' },
  frozen:          { color: '#334155', bg: '#f1f5f9', label: 'Dibekukan',            icon: 'bx-lock-alt' },
};

const COURIER_NAMES = {
  jne: 'JNE', jnt: 'J&T Express', sicepat: 'SiCepat', anteraja: 'AnterAja',
  wahana: 'Wahana', pos: 'Pos Indonesia', tiki: 'TIKI', gosend: 'GoSend',
  grabexpress: 'GrabExpress', shopee_xpress: 'Shopee Xpress',
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  .od * { box-sizing: border-box; font-family: 'Inter', -apple-system, sans-serif; }

  .od-card {
    background: #fff;
    border: 1px solid #e8edf4;
    border-radius: 16px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02);
    overflow: hidden;
  }

  .od-card-header {
    padding: 16px 20px;
    border-bottom: 1px solid #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: linear-gradient(135deg, #fafbff 0%, #fff 100%);
  }

  .od-section-title {
    font-size: 13px;
    font-weight: 800;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
  }

  .od-info-row {
    display: flex;
    gap: 4px;
    flex-direction: column;
  }
  .od-info-label {
    font-size: 11px;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .od-info-value {
    font-size: 13px;
    font-weight: 600;
    color: #1e293b;
  }

  .od-divider {
    height: 1px;
    background: #f1f5f9;
    margin: 0;
  }

  .od-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 18px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.18s ease;
    border: none;
    width: 100%;
    justify-content: center;
  }
  .od-btn-primary {
    background: linear-gradient(135deg, #4f46e5, #6366f1);
    color: #fff;
    box-shadow: 0 4px 12px rgba(79,70,229,0.25);
  }
  .od-btn-primary:hover { background: linear-gradient(135deg, #4338ca, #4f46e5); transform: translateY(-1px); }
  .od-btn-danger {
    background: #fff;
    color: #dc2626;
    border: 1.5px solid #fca5a5;
  }
  .od-btn-danger:hover { background: #fee2e2; }
  .od-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none !important; }

  .od-product-row {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    padding: 18px 20px;
    border-bottom: 1px solid #f8fafc;
    transition: background 0.15s;
  }
  .od-product-row:last-child { border-bottom: none; }
  .od-product-row:hover { background: #fafbff; }

  .od-product-img {
    width: 64px;
    height: 64px;
    border-radius: 12px;
    object-fit: cover;
    background: #f1f5f9;
    border: 1px solid #e8edf4;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .od-tag {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .od-fin-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid #f8fafc;
    font-size: 13px;
  }
  .od-fin-row:last-child { border-bottom: none; }

  .od-timeline-bar {
    display: flex;
    align-items: center;
    gap: 0;
    padding: 20px;
    overflow-x: auto;
  }

  .od-step-circle {
    width: 34px; height: 34px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 800;
    flex-shrink: 0;
    transition: all 0.3s;
  }

  .od-step-label {
    font-size: 9.5px; font-weight: 700;
    text-align: center; margin-top: 6px;
    text-transform: uppercase; letter-spacing: 0.04em;
    max-width: 60px;
  }

  .od-grid { display: grid; gap: 20px; }

  .od-address-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  @media (max-width: 1100px) {
    .od-main-grid { grid-template-columns: 1fr !important; }
  }
  @media (max-width: 640px) {
    .od-address-grid { grid-template-columns: 1fr; }
    .od-header-row { flex-direction: column; align-items: flex-start !important; }
  }

  .od-spinner {
    width: 36px; height: 36px;
    border: 3px solid #e8edf4;
    border-top-color: #4f46e5;
    border-radius: 50%;
    animation: od-spin 0.7s linear infinite;
  }
  @keyframes od-spin { to { transform: rotate(360deg); } }

  textarea.od-textarea {
    width: 100%;
    padding: 10px 14px;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    font-size: 13px;
    font-family: 'Inter', sans-serif;
    resize: vertical;
    color: #1e293b;
    outline: none;
    transition: border 0.18s;
  }
  textarea.od-textarea:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
`;

// ── HELPERS ───────────────────────────────────────────────────
const InfoRow = ({ label, value, icon, mono = false }) => (
  <div className="od-info-row">
    <div className="od-info-label">
      {icon && <i className={`bx ${icon}`} style={{ fontSize: 11, marginRight: 3 }} />}
      {label}
    </div>
    <div className="od-info-value" style={{ fontFamily: mono ? 'monospace' : undefined, wordBreak: 'break-all' }}>
      {value || <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>—</span>}
    </div>
  </div>
);

const FinRow = ({ label, value, color, sub }) => (
  <div className="od-fin-row">
    <span style={{ color: '#64748b', fontSize: 13 }}>{label}</span>
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontWeight: 700, color: color || '#1e293b', fontSize: 14 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: '#94a3b8' }}>{sub}</div>}
    </div>
  </div>
);

export default function AdminOrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [breakdown, setBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [note, setNote] = useState('');
  const [shippingModal, setShippingModal] = useState(null); // group object or null

  const load = () => {
    setLoading(true);
    fetchJson(`${API}/orders/${id}`)
      .then(d => {
        setOrder(d.data || d);
        setBreakdown(d.finance_breakdown || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const updateStatus = (newStatus) => {
    if (!window.confirm(`Ganti status ke "${newStatus.replace(/_/g,' ').toUpperCase()}"?`)) return;
    setUpdating(true);
    fetchJson(`${API}/orders/status`, {
      method: 'POST',
      body: JSON.stringify({ order_id: id, status: newStatus, note }),
    }).then(() => { load(); setNote(''); })
      .catch(err => alert(err.message || 'Gagal update status'))
      .finally(() => setUpdating(false));
  };

  // ── LOADING ──────────────────────────────────────────────────
  if (loading) return (
    <div className="od" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '70vh', flexDirection: 'column', gap: 14 }}>
      <style>{CSS}</style>
      <div className="od-spinner" />
      <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.1em', margin: 0 }}>MEMUAT PESANAN...</p>
    </div>
  );

  if (!order) return (
    <div className="od" style={{ padding: 32, textAlign: 'center' }}>
      <style>{CSS}</style>
      <i className="bx bx-search-alt" style={{ fontSize: 48, color: '#cbd5e1', marginBottom: 12, display: 'block' }} />
      <h4 style={{ margin: 0, fontWeight: 800 }}>Pesanan Tidak Ditemukan</h4>
      <p style={{ color: '#94a3b8', marginTop: 8 }}>ID tidak valid atau pesanan sudah dihapus.</p>
      <Link to="/admin/orders" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, border: '1.5px solid #e2e8f0', color: '#475569', fontWeight: 700, fontSize: 13, textDecoration: 'none', marginTop: 16 }}>
        <i className="bx bx-arrow-back" /> Kembali
      </Link>
    </div>
  );

  const sm = STATUS_META[order.status] || { color: '#64748b', bg: '#f1f5f9', label: order.status, icon: 'bx-circle' };
  const allowedNext = nextAllowedStatus[order.status] || [];
  const statusSteps = ['pending_payment', 'paid', 'processing', 'ready_to_ship', 'shipped', 'delivered', 'completed'];
  const currentIdx = statusSteps.indexOf(order.status);
  const isCancelled = ['cancelled', 'refunded', 'frozen'].includes(order.status);

  const stepLabels = {
    pending_payment: 'Pending',
    paid: 'Dibayar',
    processing: 'Proses',
    ready_to_ship: 'Siap Kirim',
    shipped: 'Dikirim',
    delivered: 'Terkirim',
    completed: 'Selesai',
  };

  return (
    <div className="od" style={{ padding: '20px 16px 48px', background: '#f8fafc', minHeight: '100vh' }}>
      <style>{CSS}</style>

      {/* ── TOP BAR ─────────────────────────────────────────── */}
      <div className="od-header-row" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 22 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Link to="/admin/orders" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#64748b', textDecoration: 'none', padding: '4px 10px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', transition: 'all 0.15s' }}>
              <i className="bx bx-arrow-back" style={{ fontSize: 14 }} /> Semua Pesanan
            </Link>
            <i className="bx bx-chevron-right" style={{ fontSize: 14, color: '#cbd5e1' }} />
            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Detail</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.03em' }}>
            {order.order_number}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              <i className="bx bx-calendar" style={{ fontSize: 12, marginRight: 3 }} />
              {fmtDate(order.created_at)}
            </span>
            <span style={{ color: '#e2e8f0' }}>•</span>
            <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' }}>{order.id?.slice(0, 12)}...</span>
          </div>
        </div>
        {/* Status badge */}
        <div style={{ padding: '8px 16px', borderRadius: 12, background: sm.bg, color: sm.color, fontWeight: 800, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <i className={`bx ${sm.icon}`} style={{ fontSize: 16 }} />
          {sm.label.toUpperCase()}
        </div>
      </div>

      {/* ── PROGRESS TIMELINE ────────────────────────────────── */}
      {!isCancelled && (
        <div className="od-card" style={{ marginBottom: 20 }}>
          <div className="od-card-header">
            <h3 className="od-section-title">
              <i className="bx bx-transfer" style={{ color: '#6366f1' }} />
              Progress Pengiriman
            </h3>
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
              {sm.label}
            </span>
          </div>
          <div className="od-timeline-bar">
            {statusSteps.map((s, i) => {
              const done = i < currentIdx || (i === currentIdx && !isCancelled);
              const active = i === currentIdx;
              return (
                <React.Fragment key={s}>
                  {i > 0 && (
                    <div style={{ flex: 1, height: 3, minWidth: 16, background: done ? 'linear-gradient(90deg, #6366f1, #818cf8)' : '#e8edf4', borderRadius: 2, margin: '0 4px', marginBottom: 28 }} />
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div className="od-step-circle" style={{
                      background: done ? 'linear-gradient(135deg, #4f46e5, #818cf8)' : '#fff',
                      border: done ? 'none' : '2px solid #e2e8f0',
                      color: done ? '#fff' : '#94a3b8',
                      boxShadow: active ? '0 0 0 4px rgba(99,102,241,0.2)' : done ? '0 4px 8px rgba(79,70,229,0.25)' : 'none',
                    }}>
                      {done ? <i className="bx bx-check" style={{ fontSize: 16 }} /> : <span style={{ fontSize: 11 }}>{i + 1}</span>}
                    </div>
                    <div className="od-step-label" style={{ color: done ? '#4f46e5' : '#94a3b8', fontWeight: active ? 800 : 600 }}>
                      {stepLabels[s]}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MAIN GRID ─────────────────────────────────────────── */}
      <div className="od-main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>

        {/* ═══ LEFT COLUMN ═══════════════════════════════════ */}
        <div className="od-grid" style={{ gridTemplateColumns: '1fr' }}>

          {/* BUYER & SHIPPING ADDRESS */}
          <div className="od-card">
            <div className="od-card-header">
              <h3 className="od-section-title">
                <i className="bx bx-map" style={{ color: '#6366f1' }} /> Informasi Pengiriman
              </h3>
              {order.order_type === 'pos' && (
                <span className="od-tag" style={{ background: '#fef3c7', color: '#92400e' }}>
                  <i className="bx bx-store" /> POS / Kasir
                </span>
              )}
            </div>
            <div style={{ padding: 20 }}>
              {/* Recipient */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 20, padding: 16, background: 'linear-gradient(135deg, #eef2ff, #f5f3ff)', borderRadius: 12, border: '1px solid #c7d2fe' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #4f46e5, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="bx bx-user" style={{ fontSize: 22, color: '#fff' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#1e293b' }}>{order.shipping_name || '—'}</div>
                  <div style={{ fontSize: 13, color: '#6366f1', fontWeight: 600, marginTop: 2 }}>
                    <i className="bx bx-phone" style={{ fontSize: 12, marginRight: 4 }} />
                    {order.shipping_phone || '—'}
                  </div>
                  {order.buyer_id && (
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, fontFamily: 'monospace' }}>
                      Buyer ID: {order.buyer_id.slice(0, 16)}...
                    </div>
                  )}
                </div>
              </div>

              {/* Address breakdown */}
              <div className="od-address-grid">
                <div style={{ gridColumn: '1 / -1' }}>
                  <InfoRow
                    label="Alamat Lengkap"
                    icon="bx-home"
                    value={order.shipping_address}
                  />
                </div>
                <InfoRow label="Kecamatan / Distrik" icon="bx-map-alt" value={order.shipping_district} />
                <InfoRow label="Kota / Kabupaten"    icon="bx-buildings" value={order.shipping_city} />
                <InfoRow label="Provinsi"             icon="bx-globe"    value={order.shipping_province} />
                <InfoRow label="Kode Pos (ZIP)"       icon="bx-location-plus" value={order.shipping_postal_code} mono />
              </div>
            </div>
          </div>

          {/* ORDER ITEMS PER MERCHANT */}
          <div className="od-card">
            <div className="od-card-header">
              <h3 className="od-section-title">
                <i className="bx bx-package" style={{ color: '#6366f1' }} /> Rincian Produk per Toko
              </h3>
              <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
                {order.merchant_groups?.length || 0} toko
              </span>
            </div>

            {order.merchant_groups?.map((group, gi) => {
              const gStatus = STATUS_META[group.status] || { color: '#64748b', bg: '#f1f5f9', label: group.status };
              const courier = COURIER_NAMES[group.courier_code] || group.courier_code;
              return (
                <div key={group.id} style={{ borderBottom: gi < order.merchant_groups.length - 1 ? '8px solid #f8fafc' : 'none' }}>
                  {/* Merchant header */}
                  <div style={{ padding: '14px 20px', background: '#fafbff', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="bx bx-store" style={{ fontSize: 18, color: '#fff' }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>
                          {group.merchant?.store_name || `Merchant #${group.merchant_id?.slice(0, 8)}`}
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
                          {group.merchant_id?.slice(0, 20)}...
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className="od-tag" style={{ background: gStatus.bg, color: gStatus.color }}>
                        {group.status.replace(/_/g, ' ')}
                      </span>
                      {group.shipping_type === 'pickup' && (
                        <span className="od-tag" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                          <i className="bx bx-walk" /> Ambil Sendiri
                        </span>
                      )}
                      {/* Kelola Resi button - available for admin/superadmin */}
                      {group.shipping_type !== 'pickup' && (
                        <button
                          onClick={() => setShippingModal(group)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '5px 12px', borderRadius: 8,
                            background: group.tracking_number ? '#f0fdf4' : 'linear-gradient(135deg, #6366f1, #818cf8)',
                            border: group.tracking_number ? '1px solid #86efac' : 'none',
                            color: group.tracking_number ? '#15803d' : '#fff',
                            fontSize: 11, fontWeight: 700, cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          <i className={`bx ${group.tracking_number ? 'bx-printer' : 'bx-barcode'}`} style={{ fontSize: 13 }} />
                          {group.tracking_number ? 'Cetak Resi' : 'Kelola Resi'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Shipping info for this group */}
                  {(group.courier_code || group.tracking_number) && (
                    <div style={{ padding: '10px 20px', background: '#f0f9ff', borderBottom: '1px solid #e0f2fe', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                      {courier && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#0284c7' }}>
                          <i className="bx bx-cycling" style={{ fontSize: 16 }} />
                          <span style={{ fontWeight: 700 }}>{courier}</span>
                          {group.courier_service && <span style={{ color: '#0ea5e9' }}>· {group.courier_service.toUpperCase()}</span>}
                        </div>
                      )}
                      {group.tracking_number && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#334155' }}>
                          <i className="bx bx-barcode" style={{ fontSize: 16 }} />
                          <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{group.tracking_number}</span>
                        </div>
                      )}
                      {group.shipped_at && (
                        <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className="bx bx-time" /> {fmtDate(group.shipped_at)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Product items */}
                  {group.items?.map((it) => {
                    let meta = {};
                    try { meta = JSON.parse(it.metadata || '{}'); } catch (_) {}
                    const hasImg = it.product_image_url;
                    return (
                      <div key={it.id} className="od-product-row">
                        {/* Image */}
                        <div className="od-product-img">
                          {hasImg
                            ? <img src={it.product_image_url} alt={it.product_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <i className="bx bx-image-alt" style={{ fontSize: 28, color: '#cbd5e1' }} />
                          }
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 4 }}>
                            {it.product_name}
                          </div>

                          {/* Variant & SKU */}
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                            {it.variant_name && (
                              <span className="od-tag" style={{ background: '#eef2ff', color: '#4f46e5' }}>
                                <i className="bx bx-purchase-tag" /> {it.variant_name}
                              </span>
                            )}
                            {it.sku && (
                              <span className="od-tag" style={{ background: '#f1f5f9', color: '#64748b', fontFamily: 'monospace' }}>
                                SKU: {it.sku}
                              </span>
                            )}
                            {Object.entries(meta).map(([k, v]) => (
                              <span key={k} className="od-tag" style={{ background: '#fff7ed', color: '#9a3412' }}>
                                {k}: {v}
                              </span>
                            ))}
                          </div>

                          {/* Commission */}
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, color: '#94a3b8', background: '#f8fafc', padding: '2px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 3 }}>
                              <i className="bx bx-percent" style={{ fontSize: 10 }} />
                              Komisi {(it.commission_rate * 100).toFixed(1)}% = {idr(it.commission_amount)}
                            </span>
                            {it.weight > 0 && (
                              <span style={{ fontSize: 11, color: '#94a3b8', background: '#f8fafc', padding: '2px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 3 }}>
                                <i className="bx bx-dumbbell" style={{ fontSize: 10 }} />
                                {it.weight}g
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Price */}
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontWeight: 800, color: '#4f46e5', fontSize: 15 }}>{idr(it.subtotal)}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>
                            {idr(it.unit_price)} × {it.quantity}
                          </div>
                          <span className="od-tag" style={{ background: '#f1f5f9', color: '#475569', marginTop: 6 }}>
                            <i className="bx bx-cart" /> Qty {it.quantity}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Per-group subtotals */}
                  <div style={{ padding: '12px 20px', background: '#fafbff', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 12 }}>
                        <span style={{ color: '#94a3b8' }}>Subtotal Toko: </span>
                        <span style={{ fontWeight: 700, color: '#1e293b' }}>{idr(group.subtotal)}</span>
                      </div>
                      <div style={{ fontSize: 12 }}>
                        <span style={{ color: '#94a3b8' }}>Ongkir: </span>
                        <span style={{ fontWeight: 700, color: '#1e293b' }}>{idr(group.shipping_cost)}</span>
                      </div>
                      <div style={{ fontSize: 12 }}>
                        <span style={{ color: '#94a3b8' }}>Payout Merchant: </span>
                        <span style={{ fontWeight: 700, color: '#16a34a' }}>{idr(group.merchant_payout)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* PAYMENT & ORDER META */}
          <div className="od-card">
            <div className="od-card-header">
              <h3 className="od-section-title">
                <i className="bx bx-credit-card" style={{ color: '#6366f1' }} /> Informasi Pembayaran & Pesanan
              </h3>
            </div>
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
              <InfoRow label="Metode Pembayaran" icon="bx-wallet" value={formatPaymentMethod(order.payment_method)} />
              <InfoRow label="Tipe Pesanan"      icon="bx-box"    value={
                order.order_type === 'pos' ? 'POS / Kasir' : 'Online'
              } />
              <InfoRow label="Total Berat"       icon="bx-dumbbell" value={
                order.total_weight ? `${(order.total_weight).toLocaleString('id-ID')} gram` : '—'
              } />
              <InfoRow label="Kode Voucher"      icon="bx-gift"   value={order.voucher_code} mono />
              <InfoRow label="Kode Referral"     icon="bx-share-alt" value={order.affiliate_ref_code} mono />
              <InfoRow label="Dibayar Pada"      icon="bx-time-five" value={fmtDate(order.paid_at)} />
              {order.cancelled_at && (
                <InfoRow label="Dibatalkan Pada"  icon="bx-x-circle" value={fmtDate(order.cancelled_at)} />
              )}
              {order.completed_at && (
                <InfoRow label="Selesai Pada"     icon="bxs-badge-check" value={fmtDate(order.completed_at)} />
              )}
              {order.notes && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <InfoRow label="Catatan Pembeli" icon="bx-note" value={order.notes} />
                </div>
              )}
              {order.cancel_reason && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <InfoRow label="Alasan Batal" icon="bx-error" value={order.cancel_reason} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══ RIGHT COLUMN ══════════════════════════════════ */}
        <div className="od-grid" style={{ gridTemplateColumns: '1fr' }}>

          {/* ACTION PANEL */}
          <div className="od-card">
            <div className="od-card-header">
              <h3 className="od-section-title">
                <i className="bx bx-cog" style={{ color: '#6366f1' }} /> Aksi Pesanan
              </h3>
            </div>
            <div style={{ padding: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Catatan Internal
              </div>
              <textarea
                className="od-textarea"
                rows={3}
                placeholder="Tambahkan catatan untuk update status ini..."
                value={note}
                onChange={e => setNote(e.target.value)}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                {allowedNext.length > 0 ? allowedNext.map(st => {
                  const isDanger = st.includes('refund') || st === 'cancelled';
                  return (
                    <button
                      key={st}
                      className={`od-btn ${isDanger ? 'od-btn-danger' : 'od-btn-primary'}`}
                      onClick={() => updateStatus(st)}
                      disabled={updating}
                    >
                      {updating
                        ? <><i className="bx bx-loader-alt bx-spin" /> Memproses...</>
                        : <>
                            <i className={`bx ${isDanger ? 'bx-undo' : 'bx-transfer-alt'}`} />
                            {st.replace(/_/g, ' ').toUpperCase()}
                          </>
                      }
                    </button>
                  );
                }) : (
                  <div style={{ textAlign: 'center', padding: '16px 12px', background: '#f8fafc', borderRadius: 12, border: '1px dashed #e2e8f0' }}>
                    <i className="bx bxs-badge-check" style={{ fontSize: 28, color: '#16a34a', display: 'block', marginBottom: 6 }} />
                    <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>Tidak ada aksi tersedia</span>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Status akhir tercapai</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* FINANCIAL SUMMARY */}
          <div className="od-card">
            <div className="od-card-header">
              <h3 className="od-section-title">
                <i className="bx bx-dollar-circle" style={{ color: '#6366f1' }} /> Ringkasan Finansial
              </h3>
            </div>
            <div style={{ padding: 18 }}>
              <FinRow label="Subtotal Produk"    value={idr(order.subtotal)} />
              <FinRow label="Ongkos Kirim"        value={idr(order.total_shipping_cost)} />
              {order.total_discount > 0 && (
                <FinRow label="Diskon / Voucher"  value={`-${idr(order.total_discount)}`} color="#16a34a" />
              )}
              {order.shopping_balance_deduction > 0 && (
                <FinRow label="Saldo Shopping"    value={`-${idr(order.shopping_balance_deduction)}`} color="#16a34a" />
              )}

              {/* Grand Total */}
              <div style={{ margin: '14px 0', padding: 14, background: 'linear-gradient(135deg, #4f46e5, #6366f1)', borderRadius: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Grand Total Dibayar Buyer</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em' }}>{idr(order.grand_total)}</div>
              </div>

              {/* Alokasi */}
              <FinRow
                label="Platform Fee"
                value={`+${idr(order.total_platform_fee)}`}
                color="#16a34a"
                sub="Pendapatan platform"
              />
              {order.total_commission > 0 && (
                <FinRow
                  label="Komisi Affiliate"
                  value={`-${idr(order.total_commission)}`}
                  color="#dc2626"
                  sub="Dibayarkan ke afiliasi"
                />
              )}
            </div>


            {/* Detailed ledger breakdown */}
            {breakdown.length > 0 && (
              <>
                <div className="od-divider" />
                <div style={{ padding: 18 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                    <i className="bx bx-spreadsheet" style={{ marginRight: 4 }} />
                    Rincian Ledger (Alokasi Dana)
                  </div>
                  {breakdown.map((b, i) => {
                    const out = b.amount < 0;
                    return (
                      <div key={b.id || i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: i < breakdown.length - 1 ? '1px dashed #f1f5f9' : 'none' }}>
                        <div style={{ flex: 1, paddingRight: 10 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                            {b.owner_name}
                            <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', marginLeft: 6, textTransform: 'uppercase' }}>({b.owner_type})</span>
                          </div>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{b.description || b.type?.replace(/_/g, ' ')}</div>
                        </div>
                        <div style={{ fontWeight: 800, fontSize: 13, color: out ? '#dc2626' : '#16a34a', whiteSpace: 'nowrap' }}>
                          {out ? '-' : '+'}{idr(Math.abs(b.amount))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* TIMESTAMPS */}
          <div className="od-card">
            <div className="od-card-header">
              <h3 className="od-section-title">
                <i className="bx bx-time" style={{ color: '#6366f1' }} /> Timeline Waktu
              </h3>
            </div>
            <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <InfoRow label="Dibuat"        icon="bx-calendar-plus"  value={fmtDate(order.created_at)} />
              <InfoRow label="Kadaluwarsa"   icon="bx-alarm-exclamation" value={fmtDate(order.expired_at)} />
              {order.paid_at       && <InfoRow label="Dibayar"      icon="bx-check-circle"   value={fmtDate(order.paid_at)} />}
              {order.completed_at  && <InfoRow label="Selesai"      icon="bxs-badge-check"   value={fmtDate(order.completed_at)} />}
              {order.cancelled_at  && <InfoRow label="Dibatalkan"   icon="bx-x-circle"       value={fmtDate(order.cancelled_at)} />}
              {order.auto_complete_at && <InfoRow label="Auto Complete" icon="bx-bot" value={fmtDate(order.auto_complete_at)} />}
            </div>
          </div>
        </div>
      </div>

      {/* Shipping Action Modal */}
      {shippingModal && (
        <ShippingActionModal
          group={shippingModal}
          onClose={() => setShippingModal(null)}
          onSuccess={() => {
            setShippingModal(null);
            load(); // reload order data to show updated tracking
          }}
        />
      )}
    </div>
  );
}