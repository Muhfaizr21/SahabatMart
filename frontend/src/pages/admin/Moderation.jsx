import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';

const API = ADMIN_API_BASE;
const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

export default function AdminModeration() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadPending = () => {
    setLoading(true);
    fetchJson(`${API}/products?status=pending&search=${search}`)
      .then(d => setProducts(d.data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadPending(); }, []);

  const moderate = (id, status, note) => {
    if (!window.confirm('Konfirmasi tindakan moderasi ini?')) return;
    setLoading(true);
    fetchJson(`${API}/products/moderate`, {
      method: 'PUT',
      body: JSON.stringify({ id, status, note })
    }).then(() => loadPending())
      .catch(err => alert(err.message));
  };

  return (
    <div className="container-fluid py-4" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Monster Header */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between mb-4 bg-white p-4 rounded-4 shadow-sm border border-light gap-3">
        <div>
          <h4 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
            <i className="bx bxs-shield-check text-warning" />
            Product Quality Shield
          </h4>
          <p className="text-secondary small mb-0">Tinjau dan validasi produk baru sebelum dipublikasikan ke publik.</p>
        </div>
        <div className="d-flex gap-2">
           <input type="text" className="form-control border-light shadow-none" placeholder="Cari nama produk..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadPending()} />
           <button className="btn btn-primary px-4 fw-bold shadow-sm" onClick={loadPending}>Cari</button>
        </div>
      </div>

      {/* Alert Banner Container */}
      {products.length > 0 && (
         <div className="alert bg-warning-subtle border-warning p-4 rounded-4 shadow-sm mb-4 d-flex align-items-center gap-3">
            <div className="bg-warning text-white rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 48, height: 48 }}>
               <i className="bx bxs-bell-ring fs-4" />
            </div>
            <div>
               <h6 className="fw-bold text-warning-emphasis mb-1">Moderasi Antrian Terbuka</h6>
               <p className="text-warning-emphasis small mb-0">Ada <span className="fw-bold">{products.length} produk</span> yang menunggu tinjauan segera dari tim administrator.</p>
            </div>
         </div>
      )}

      {/* Modern Table List */}
      <div className="card border-0 rounded-4 shadow-sm overflow-hidden border border-light">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="bg-light">
              <tr>
                <th className="ps-4 py-3 text-uppercase small fw-bold text-secondary">Informasi Produk</th>
                <th className="py-3 text-uppercase small fw-bold text-secondary">Toko & Merchant</th>
                <th className="py-3 text-uppercase small fw-bold text-secondary">Nilai Jual</th>
                <th className="pe-4 py-3 text-uppercase small fw-bold text-secondary text-end">Konfirmasi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-5"><div className="spinner-border text-primary" /></td></tr>
              ) : products.length === 0 ? (
                <tr>
                   <td colSpan={4} className="text-center py-5">
                      <i className="bx bx-check-shield text-light-emphasis d-block mb-3" style={{ fontSize: 72 }} />
                      <h5 className="fw-bold text-dark mb-1">Semua Bersih!</h5>
                      <p className="text-secondary mb-0">Tidak ada produk baru dalam antrian moderasi saat ini.</p>
                   </td>
                </tr>
              ) : products.map((p) => (
                <tr key={p.id}>
                  <td className="ps-4 py-3">
                    <div className="d-flex align-items-center gap-3">
                      <img src={p.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random`} className="rounded-3 border" style={{ width: 50, height: 50, objectFit: 'cover' }} alt="" />
                      <div>
                        <div className="fw-bold text-dark fs-6">{p.name}</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>PROD-ID: {p.id.slice(0, 8).toUpperCase()}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                       <div className="bg-light p-2 rounded-circle" style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <i className="bx bx-store text-primary" />
                       </div>
                       <span className="fw-600 text-dark small">{p.store_name || 'Merchant SahabatMart'}</span>
                    </div>
                  </td>
                  <td>
                    <div className="fw-bold text-dark">{fmt(p.price)}</div>
                    <div className="text-success small fw-bold" style={{ fontSize: 10 }}><i className="bx bxs-up-arrow-alt" /> Optimal Price</div>
                  </td>
                  <td className="pe-4 text-end">
                    <div className="d-flex flex-column flex-md-row justify-content-end gap-2">
                      <button className="btn btn-success btn-sm px-3 rounded-pill fw-bold shadow-sm d-flex align-items-center justify-content-center gap-1" onClick={() => moderate(p.id, 'active', 'Disetujui Admin')}>
                        <i className="bx bx-check-circle fs-5" /> Setujui
                      </button>
                      <button className="btn btn-outline-danger btn-sm px-3 rounded-pill fw-bold d-flex align-items-center justify-content-center gap-1" onClick={() => moderate(p.id, 'taken_down', 'Produk tidak memenuhi syarat')}>
                        <i className="bx bx-x-circle fs-5" /> Tolak
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {!loading && products.length > 0 && (
         <div className="mt-3 p-3 bg-white rounded-4 shadow-sm border text-secondary small d-flex justify-content-between">
            <span>Menampilkan <strong>{products.length}</strong> produk dalam antrian review</span>
            <span>Update status: manual refresh</span>
         </div>
      )}
    </div>
  );
}
