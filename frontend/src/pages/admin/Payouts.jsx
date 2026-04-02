import React, { useState, useEffect } from 'react';

const API = 'http://localhost:8080/api/admin';
const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

const StatusBadge = ({ status }) => {
  const map = {
    pending:  { cls: 'bg-warning text-dark',                   label: 'Pending' },
    approved: { cls: 'bg-info bg-opacity-10 text-info',        label: 'Disetujui' },
    rejected: { cls: 'bg-danger bg-opacity-10 text-danger',    label: 'Ditolak' },
    paid:     { cls: 'bg-success bg-opacity-10 text-success',  label: 'Dibayar' },
  };
  const b = map[status] || { cls: 'bg-secondary text-white', label: status };
  return <span className={`badge ${b.cls}`}>{b.label}</span>;
};

export default function AdminPayouts() {
  const [payouts, setPayouts]       = useState([]);
  const [filterStatus, setFilter]   = useState('pending');
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(null);
  const [note, setNote]             = useState('');
  const [processing, setProcessing] = useState(false);
  const [msg, setMsg]               = useState('');

  const load = () => {
    setLoading(true);
    const params = filterStatus ? `?status=${filterStatus}` : '';
    fetch(API + '/payouts' + params)
      .then(r => r.json())
      .then(d => setPayouts(d.data || []))
      .catch(() => setPayouts([
        { id: 'po1', merchant_id: 'm1', amount: 2500000, status: 'pending', requested_at: '2026-04-01', note: '' },
        { id: 'po2', merchant_id: 'm2', amount: 750000,  status: 'pending', requested_at: '2026-03-30', note: '' },
        { id: 'po3', merchant_id: 'm3', amount: 5000000, status: 'paid',    requested_at: '2026-03-25', note: 'Transfer BCA' },
      ]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterStatus]);

  const process = (status) => {
    if (!selected) return;
    setProcessing(true);
    fetch(API + '/payouts/process', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payout_id:    selected.id,
        status,
        note,
        processed_by: 'admin',
      }),
    }).then(() => {
      setMsg(`Payout berhasil ${status === 'paid' ? 'ditandai lunas' : status === 'approved' ? 'disetujui' : 'ditolak'}`);
      setTimeout(() => setMsg(''), 3000);
      setSelected(null);
      setNote('');
      load();
    }).finally(() => setProcessing(false));
  };

  const totalPending = payouts.filter(p => p.status === 'pending').reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <>
      <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
        <div className="breadcrumb-title pe-3">Super Admin</div>
        <div className="ps-3"><nav><ol className="breadcrumb mb-0 p-0">
          <li className="breadcrumb-item active">Manajemen Payout</li>
        </ol></nav></div>
      </div>

      {/* Summary */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Total Request', val: payouts.length, color: '#4361ee' },
          { label: 'Pending Approval', val: payouts.filter(p => p.status === 'pending').length, color: '#f4a261' },
          { label: 'Nominal Pending', val: fmt(totalPending), color: '#ef476f' },
          { label: 'Sudah Dibayar', val: payouts.filter(p => p.status === 'paid').length, color: '#06d6a0' },
        ].map(s => (
          <div key={s.label} className="col-6 col-lg-3">
            <div className="card radius-10 h-100">
              <div className="card-body text-center py-3">
                <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 12, color: 'var(--bs-secondary-color)' }}>{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {msg && (
        <div className="alert alert-success py-2 mb-3">
          <i className="bi bi-check-circle me-2"></i>{msg}
        </div>
      )}

      <div className="card radius-10">
        <div className="card-body">
          <div className="d-flex gap-2 mb-3 flex-wrap align-items-center">
            <span className="fw-semibold small me-2">Filter:</span>
            {['', 'pending', 'approved', 'paid', 'rejected'].map(s => (
              <button key={s || 'all'} className={`btn btn-sm ${filterStatus === s ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setFilter(s)}>
                {s === '' ? 'Semua' : s === 'pending' ? '⏳ Pending' : s === 'approved' ? '✅ Approved' : s === 'paid' ? '💰 Paid' : '❌ Rejected'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>ID Payout</th>
                    <th>Merchant ID</th>
                    <th>Nominal</th>
                    <th>Status</th>
                    <th>Catatan</th>
                    <th>Tgl Request</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.length === 0 ? (
                    <tr><td colSpan={7} className="text-center text-muted py-4">Tidak ada payout ditemukan</td></tr>
                  ) : payouts.map(p => (
                    <tr key={p.id}>
                      <td className="text-muted small">{p.id?.slice(0, 8)}…</td>
                      <td className="text-muted small">{p.merchant_id?.slice(0, 8)}…</td>
                      <td className="fw-semibold">{fmt(p.amount)}</td>
                      <td><StatusBadge status={p.status} /></td>
                      <td className="text-muted small" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.note || '—'}
                      </td>
                      <td className="text-muted small">
                        {p.requested_at ? new Date(p.requested_at).toLocaleDateString('id-ID') : '—'}
                      </td>
                      <td>
                        {p.status === 'pending' && (
                          <div className="d-flex gap-1">
                            <button className="btn btn-xs btn-outline-success" title="Setujui" onClick={() => setSelected(p)}>
                              <i className="bi bi-check-circle"></i>
                            </button>
                            <button className="btn btn-xs btn-outline-danger" title="Tolak"
                              onClick={() => { setSelected(p); }}>
                              <i className="bi bi-x-circle"></i>
                            </button>
                          </div>
                        )}
                        {p.status === 'approved' && (
                          <button className="btn btn-xs btn-success" onClick={() => process('paid')}>
                            <i className="bi bi-cash me-1"></i>Bayar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Process Modal */}
      {selected && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Proses Payout</h5>
                <button className="btn-close" onClick={() => setSelected(null)}></button>
              </div>
              <div className="modal-body">
                <p className="mb-1"><span className="text-muted">Nominal:</span> <strong>{fmt(selected.amount)}</strong></p>
                <p className="mb-3"><span className="text-muted">Merchant:</span> <code className="small">{selected.merchant_id}</code></p>
                <label className="form-label">Catatan</label>
                <textarea className="form-control" rows={2} value={note} onChange={e => setNote(e.target.value)}
                  placeholder="Misal: Transfer via BCA 123***"></textarea>
              </div>
              <div className="modal-footer gap-2">
                <button className="btn btn-secondary btn-sm" onClick={() => setSelected(null)}>Batal</button>
                <button className="btn btn-danger btn-sm" disabled={processing} onClick={() => process('rejected')}>
                  {processing ? <span className="spinner-border spinner-border-sm"></span> : <><i className="bi bi-x-circle me-1"></i>Tolak</>}
                </button>
                <button className="btn btn-success btn-sm" disabled={processing} onClick={() => process('paid')}>
                  {processing ? <span className="spinner-border spinner-border-sm"></span> : <><i className="bi bi-cash me-1"></i>Bayar Sekarang</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
