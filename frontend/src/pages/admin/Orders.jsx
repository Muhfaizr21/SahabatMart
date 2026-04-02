import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API = 'http://localhost:8080/api/admin';
const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const loadOrders = () => {
    setLoading(true);
    fetch(`${API}/orders?status=${statusFilter}`)
      .then(r => r.json())
      .then(d => setOrders(d.data || []))
      .catch(err => console.error("Error loading orders:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  return (
    <>
      <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
        <div className="breadcrumb-title pe-3">Super Admin</div>
        <div className="ps-3">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0 p-0">
              <li className="breadcrumb-item"><Link to="/admin"><i className="bx bx-home-alt"></i></Link></li>
              <li className="breadcrumb-item active" aria-current="page">Semua Pesanan</li>
            </ol>
          </nav>
        </div>
      </div>

      <div className="card radius-10">
        <div className="card-header py-3">
          <div className="row align-items-center m-0">
            <div className="col-md-3 col-12 me-auto mb-md-0 mb-3">
              <h6 className="mb-0 fw-bold">Monitoring Pesanan Platform</h6>
            </div>
            <div className="col-md-2 col-6">
              <select className="form-select form-select-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="">Semua Status</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="banned">Banned</option>
              </select>
            </div>
          </div>
        </div>
        <div className="card-body">
          {loading ? (
             <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle table-striped mb-0">
                <thead className="table-light">
                  <tr>
                    <th>#Order ID</th>
                    <th>Merchant</th>
                    <th>Pembeli</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Tanggal</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-4 text-muted">Belum ada pesanan ditemukan</td></tr>
                  ) : orders.map((order) => (
                    <tr key={order.id}>
                      <td className="small"><code>{order.id.slice(0, 8)}</code></td>
                      <td><span className="badge bg-light-info text-info">{order.store_name}</span></td>
                      <td>
                        <div className="d-flex flex-column">
                            <span className="fw-bold small">{order.buyer_name}</span>
                            <span className="text-muted" style={{fontSize: 10}}>{order.buyer_email}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge rounded-pill ${
                          order.status === 'completed' ? 'bg-success' : 
                          order.status === 'pending' ? 'bg-warning text-dark' : 'bg-danger'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="fw-bold text-primary">{fmt(order.total_amount)}</td>
                      <td><span className="small text-muted">{new Date(order.created_at).toLocaleDateString('id-ID')}</span></td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <Link to="/admin/orders/detail" className="btn btn-xs btn-outline-primary" title="View Detail">
                            <i className="bi bi-eye"></i>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AdminOrders;
