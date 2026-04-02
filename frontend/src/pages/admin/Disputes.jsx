import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API = 'http://localhost:8080/api/admin';

const AdminDisputes = () => {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [decision, setDecision] = useState({ status: 'refund_approved', note: '' });

  const loadDisputes = () => {
    setLoading(true);
    fetch(`${API}/disputes`)
      .then(r => r.json())
      .then(d => setDisputes(d.data || []))
      .catch(err => console.error("Error loading disputes:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDisputes();
  }, []);

  const handleArbitrate = () => {
    if (!selectedDispute) return;
    fetch(`${API}/disputes/arbitrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: selectedDispute.id,
        status: decision.status,
        decision_note: decision.note,
        decided_by: 'admin-super'
      }),
    }).then(() => {
      loadDisputes();
      setSelectedDispute(null);
      setDecision({ status: 'refund_approved', note: '' });
    });
  };

  return (
    <>
      <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
        <div className="breadcrumb-title pe-3">Resolusi Konflik</div>
        <div className="ps-3">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0 p-0">
              <li className="breadcrumb-item"><Link to="/admin"><i className="bx bx-home-alt"></i></Link></li>
              <li className="breadcrumb-item active" aria-current="page">Pusat Sengketa (Dispute)</li>
            </ol>
          </nav>
        </div>
      </div>

      <div className="card radius-10">
        <div className="card-header py-3">
          <h6 className="mb-0 fw-bold"><i className="bi bi-exclamation-triangle-fill text-danger me-2"></i>Daftar Sengketa Refund</h6>
        </div>
        <div className="card-body">
            <div className="table-responsive">
                <table className="table align-middle table-striped">
                    <thead className="table-light">
                        <tr>
                            <th>Order ID</th>
                            <th>Alasan Sengketa</th>
                            <th>Status Akut</th>
                            <th>Tanggal</th>
                            <th className="text-end">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} className="text-center py-4"><div className="spinner-border text-primary"></div></td></tr>
                        ) : disputes.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-4 text-muted">Tidak ada sengketa yang perlu dimoderasi.</td></tr>
                        ) : disputes.map(d => (
                            <tr key={d.id}>
                                <td><code className="small text-primary">#{d.order_id.slice(0,8)}</code></td>
                                <td>
                                    <div className="fw-bold small">{d.reason}</div>
                                    <div className="text-muted" style={{fontSize:10}}>Oleh Buyer: {d.buyer_id.slice(0,8)}</div>
                                </td>
                                <td>
                                    <span className={`badge rounded-pill bg-light-${d.status === 'open' ? 'danger text-danger' : 'success text-success'}`}>
                                        {d.status.toUpperCase()}
                                    </span>
                                </td>
                                <td><span className="small text-muted">{new Date(d.created_at).toLocaleDateString('id-ID')}</span></td>
                                <td className="text-end">
                                    <button className="btn btn-xs btn-primary" onClick={() => setSelectedDispute(d)}>Arbitrasi</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>

      {/* Modal Arbitrasi (Simulated) */}
      {selectedDispute && (
        <div className="modal show d-block" style={{backgroundColor:'rgba(0,0,0,0.5)'}}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow">
                    <div className="modal-header bg-dark text-white">
                        <h6 className="modal-title small fw-bold">ARBITRASI SENGKETA #{selectedDispute.order_id.slice(0,8)}</h6>
                        <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedDispute(null)}></button>
                    </div>
                    <div className="modal-body">
                        <div className="alert alert-warning py-2 mb-3" style={{fontSize:11}}>
                            <i className="bi bi-info-circle me-1"></i> Sebagai arbitrator, keputusan Anda bersifat final dan mengikat.
                        </div>
                        <div className="mb-3">
                            <label className="form-label small fw-bold">Ambil Keputusan</label>
                            <select className="form-select form-select-sm" 
                                value={decision.status} onChange={e => setDecision({...decision, status: e.target.value})}>
                                <option value="refund_approved">Setujui Refund (Uang Kembali ke Pembeli)</option>
                                <option value="rejected">Tolak Refund (Uang Diteruskan ke Penjual)</option>
                                <option value="pending">Minta Bukti Tambahan (Pending)</option>
                            </select>
                        </div>
                        <div className="mb-3">
                            <label className="form-label small fw-bold">Alasan Keputusan (Decision Note)</label>
                            <textarea className="form-control form-control-sm" rows="3" 
                                value={decision.note} onChange={e => setDecision({...decision, note: e.target.value})}
                                placeholder="Jelaskan alasan hukum/kebijakan platform..."></textarea>
                        </div>
                    </div>
                    <div className="modal-footer bg-light py-2">
                        <button className="btn btn-sm btn-secondary" onClick={() => setSelectedDispute(null)}>Batal</button>
                        <button className="btn btn-sm btn-danger px-4" onClick={handleArbitrate}>Kirim Keputusan</button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </>
  );
};

export default AdminDisputes;
