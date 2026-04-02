import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';

const API = ADMIN_API_BASE;
const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

const AdminOrderDetail = () => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In real app, get ID from URL. Here we just fetch the latest for demo.
    fetchJson(`${API}/orders`).then(d => {
      if (d.data && d.data.length > 0) setOrder(d.data[0]);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;
  if (!order) return <div className="alert alert-warning">Pesanan tidak ditemukan atau data masih kosong.</div>;

  return (
    <>
      <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
        <div className="breadcrumb-title pe-3">Super Admin</div>
        <div className="ps-3">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0 p-0">
              <li className="breadcrumb-item"><Link to="/admin"><i className="bx bx-home-alt"></i></Link></li>
              <li className="breadcrumb-item"><Link to="/admin/orders">Pesanan</Link></li>
              <li className="breadcrumb-item active" aria-current="page">Detail Pesanan</li>
            </ol>
          </nav>
        </div>
      </div>

      <div className="row">
        <div className="col-12 col-lg-8">
            <div className="card radius-10">
                <div className="card-header py-3 bg-light">
                    <div className="d-flex align-items-center">
                        <div>
                            <h6 className="mb-0 fw-bold">Detail Pesanan #{order.id.slice(0,8)}</h6>
                            <small className="text-muted">{new Date(order.created_at).toLocaleString('id-ID')}</small>
                        </div>
                        <div className="ms-auto">
                            <span className={`badge rounded-pill ${order.status === 'completed' ? 'bg-success' : 'bg-warning text-dark'}`}>
                                {order.status.toUpperCase()}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="card-body">
                    <div className="p-3 border rounded mb-3">
                        <h6 className="mb-2 fw-bold small">ITEM PESANAN</h6>
                        <div className="d-flex align-items-center gap-3">
                            <div className="product-box border" style={{width:60, height:60}}>
                                <img src="/admin-assets/images/products/01.png" alt="" style={{width:'100%'}} />
                            </div>
                            <div className="flex-grow-1">
                                <h6 className="mb-0 small">Contoh Produk SahabatMart</h6>
                                <p className="mb-0 text-muted small">Variasi: Default | Qty: 1</p>
                            </div>
                            <div className="text-end">
                                <h6 className="mb-0 small fw-bold">{fmt(order.subtotal)}</h6>
                            </div>
                        </div>
                    </div>

                    <div className="row g-3">
                        <div className="col-12 col-md-6">
                            <div className="p-3 border rounded h-100">
                                <h6 className="mb-2 fw-bold small"> INFORMASI PEMBELI</h6>
                                <p className="mb-1 small"><strong>Nama:</strong> {order.buyer_name}</p>
                                <p className="mb-1 small"><strong>Email:</strong> {order.buyer_email}</p>
                                <p className="mb-0 small"><strong>Telp:</strong> +62 812-xxxx-xxxx</p>
                            </div>
                        </div>
                        <div className="col-12 col-md-6">
                            <div className="p-3 border rounded h-100">
                                <h6 className="mb-2 fw-bold small"> INFORMASI MERCHANT</h6>
                                <p className="mb-1 small"><strong>Toko:</strong> {order.store_name}</p>
                                <p className="mb-1 small"><strong>ID Toko:</strong> <code style={{fontSize:9}}>{order.merchant_id}</code></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="col-12 col-lg-4">
            <div className="card radius-10">
                <div className="card-header py-3">
                    <h6 className="mb-0 fw-bold">Ringkasan Pembayaran</h6>
                </div>
                <div className="card-body">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                        <span className="text-muted small">Subtotal</span>
                        <span className="small">{fmt(order.subtotal)}</span>
                    </div>
                    <div className="d-flex align-items-center justify-content-between mb-2">
                        <span className="text-muted small">Ongkos Kirim</span>
                        <span className="small">{fmt(order.total_amount - order.subtotal)}</span>
                    </div>
                    <hr />
                    <div className="d-flex align-items-center justify-content-between">
                        <h6 className="mb-0 fw-bold">TOTAL</h6>
                        <h6 className="mb-0 fw-bold text-primary">{fmt(order.total_amount)}</h6>
                    </div>
                    <div className="mt-4 d-grid">
                        <button className="btn btn-outline-primary btn-sm mb-2" onClick={() => window.print()}>
                            <i className="bi bi-printer me-1"></i> Cetak Invoice
                        </button>
                    </div>
                </div>
            </div>

            <div className="card radius-10 bg-light-info">
                <div className="card-body">
                    <h6 className="fw-bold small text-info"><i className="bi bi-info-circle me-1"></i> CATATAN PLATFORM</h6>
                    <p className="mb-0 text-muted" style={{fontSize:11}}>
                        Admin dapat melakukan penyesuaian jika terjadi sengketa antara merchant dan pembeli.
                        Semua perubahan status akan dicatat di <strong>Audit Log</strong>.
                    </p>
                </div>
            </div>
        </div>
      </div>
    </>
  );
};

export default AdminOrderDetail;
