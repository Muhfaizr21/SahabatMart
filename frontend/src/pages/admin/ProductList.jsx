import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API = 'http://localhost:8080/api/admin';
const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

const AdminProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const loadProducts = () => {
    setLoading(true);
    fetch(`${API}/products?status=${statusFilter}&search=${search}`)
      .then(r => r.json())
      .then(d => setProducts(d.data || []))
      .catch(err => console.error("Error loading products:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProducts();
  }, [statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadProducts();
  };

  const deleteProduct = (id) => {
    if (!window.confirm("Hapus produk ini?")) return;
    fetch(`${API}/products/delete?id=${id}`, { method: 'DELETE' })
      .then(() => loadProducts());
  };

  const toggleStatus = (id, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'taken_down' : 'active';
    fetch(`${API}/products/moderate`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: nextStatus, note: 'Toggled via Super Admin' })
    }).then(() => loadProducts());
  };

  return (
    <>
      <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
        <div className="breadcrumb-title pe-3">Super Admin</div>
        <div className="ps-3">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0 p-0">
              <li className="breadcrumb-item"><Link to="/admin"><i className="bx bx-home-alt"></i></Link></li>
              <li className="breadcrumb-item active" aria-current="page">Monitoring Produk</li>
            </ol>
          </nav>
        </div>
        <div className="ms-auto">
          <Link to="/admin/products/add" className="btn btn-primary btn-sm rounded-pill px-3">+ Tambah Produk</Link>
        </div>
      </div>

      <div className="card radius-10">
        <div className="card-header py-3">
          <div className="row align-items-center m-0 g-2">
            <div className="col-md-5 col-12 me-auto">
               <form onSubmit={handleSearch} className="d-flex gap-2">
                  <input type="search" className="form-control form-control-sm" placeholder="Cari nama produk..." 
                    value={search} onChange={e => setSearch(e.target.value)} />
                  <button type="submit" className="btn btn-sm btn-primary">Cari</button>
               </form>
            </div>
            <div className="col-md-2 col-6 text-end">
               <select className="form-select form-select-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="">Semua Status</option>
                  <option value="active">Aktif</option>
                  <option value="taken_down">Diturunkan</option>
                  <option value="draft">Draft</option>
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
                    <th>Produk</th>
                    <th>Toko / Merchant</th>
                    <th>Kategori</th>
                    <th>Harga</th>
                    <th>Status</th>
                    <th>Tanggal</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-4 text-muted">Belum ada produk ditemukan</td></tr>
                  ) : products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="product-box border" style={{width:40, height:40}}>
                              <img src={product.image || `/admin-assets/images/products/01.png`} alt="" style={{width:'100%', height:'100%', objectFit:'cover'}} />
                          </div>
                          <span className="fw-bold small">{product.name}</span>
                        </div>
                      </td>
                      <td><span className="badge bg-light-info text-info">{product.store_name}</span></td>
                      <td><span className="small text-muted">{product.category || 'Uncategorized'}</span></td>
                      <td className="fw-bold text-success">{fmt(product.price)}</td>
                      <td>
                        <span className={`badge rounded-pill ${product.status === 'active' ? 'bg-success' : 'bg-danger'}`}>
                          {product.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td><small className="text-muted">{new Date(product.created_at).toLocaleDateString('id-ID')}</small></td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <button onClick={() => toggleStatus(product.id, product.status)} className={`btn btn-xs ${product.status === 'active' ? 'btn-outline-warning' : 'btn-outline-success'}`} title="Moderate">
                            <i className={`bi ${product.status === 'active' ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                          </button>
                          <button className="btn btn-xs btn-outline-danger" onClick={() => deleteProduct(product.id)}>
                            <i className="bi bi-trash"></i>
                          </button>
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

export default AdminProductList;
