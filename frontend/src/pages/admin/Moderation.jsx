import React, { useState, useEffect } from 'react';

const API = 'http://localhost:8080/api/admin';

export default function AdminModeration() {
  const [products, setProducts] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [msg, setMsg]             = useState('');

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.append('status', filterStatus);
    if (search)       params.append('search', search);
    fetch(API + '/products?' + params)
      .then(r => r.json())
      .then(d => setProducts(d.data || []))
      .catch(() => setProducts([
        { id: 'p1', name: 'Sepatu Lari Pro X', store_name: 'Toko Berkah', price: 450000, is_active: true, created_at: '2026-04-01' },
        { id: 'p2', name: 'Laptop Slim 14"', store_name: 'Elektronik Murah', price: 8500000, is_active: false, created_at: '2026-03-30' },
        { id: 'p3', name: 'Jam Tangan Casual', store_name: 'Warung Jaya', price: 320000, is_active: true, created_at: '2026-03-28' },
      ]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterStatus]);

  const handleSearch = e => { e.preventDefault(); load(); };

  const moderate = (id, active) => {
    fetch(API + '/products/moderate', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active }),
    }).then(() => {
      setProducts(prev => prev.map(p => p.id === id ? { ...p, is_active: active } : p));
      setMsg(`Produk berhasil ${active ? 'diaktifkan' : 'dinonaktifkan'}`);
      setTimeout(() => setMsg(''), 2500);
    });
  };

  const deleteProduct = id => {
    if (!window.confirm('Hapus produk ini secara permanen?')) return;
    fetch(API + '/products/delete?id=' + id, { method: 'DELETE' })
      .then(() => {
        setProducts(prev => prev.filter(p => p.id !== id));
        setMsg('Produk berhasil dihapus');
        setTimeout(() => setMsg(''), 2500);
      });
  };

  const fmtRp = n => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

  return (
    <>
      <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
        <div className="breadcrumb-title pe-3">Super Admin</div>
        <div className="ps-3"><nav><ol className="breadcrumb mb-0 p-0">
          <li className="breadcrumb-item active">Moderasi Produk</li>
        </ol></nav></div>
      </div>

      {msg && (
        <div className="alert alert-success alert-dismissible py-2 mb-3" role="alert">
          <i className="bi bi-check-circle me-2"></i>{msg}
        </div>
      )}

      <div className="card radius-10">
        <div className="card-body">
          {/* Filter */}
          <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
            <form onSubmit={handleSearch} className="d-flex gap-2 flex-grow-1">
              <input type="text" className="form-control form-control-sm" style={{ maxWidth: 280 }}
                placeholder="Cari nama produk..." value={search} onChange={e => setSearch(e.target.value)} />
              <button className="btn btn-sm btn-primary" type="submit"><i className="bi bi-search"></i></button>
            </form>
            <select className="form-select form-select-sm" style={{ width: 160 }}
              value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Semua Produk</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>
          </div>

          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Produk</th>
                    <th>Toko</th>
                    <th>Harga</th>
                    <th>Status</th>
                    <th>Tgl Dibuat</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr><td colSpan={6} className="text-center text-muted py-4">Tidak ada produk</td></tr>
                  ) : products.map(p => (
                    <tr key={p.id}>
                      <td className="fw-medium">{p.name}</td>
                      <td><span className="badge bg-primary bg-opacity-10 text-primary">{p.store_name || '—'}</span></td>
                      <td>{fmtRp(p.price)}</td>
                      <td>
                        {p.is_active
                          ? <span className="badge bg-success bg-opacity-10 text-success"><i className="bi bi-circle-fill me-1" style={{ fontSize: 8 }}></i>Aktif</span>
                          : <span className="badge bg-secondary bg-opacity-10 text-secondary"><i className="bi bi-circle me-1" style={{ fontSize: 8 }}></i>Nonaktif</span>}
                      </td>
                      <td className="text-muted small">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString('id-ID') : '—'}
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          {p.is_active ? (
                            <button className="btn btn-xs btn-outline-warning" title="Nonaktifkan"
                              onClick={() => moderate(p.id, false)}>
                              <i className="bi bi-eye-slash"></i>
                            </button>
                          ) : (
                            <button className="btn btn-xs btn-outline-success" title="Aktifkan"
                              onClick={() => moderate(p.id, true)}>
                              <i className="bi bi-eye"></i>
                            </button>
                          )}
                          <button className="btn btn-xs btn-outline-danger" title="Hapus"
                            onClick={() => deleteProduct(p.id)}>
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
}
