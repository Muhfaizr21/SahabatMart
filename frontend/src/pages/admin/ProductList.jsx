import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson, formatImage } from '../../lib/api';

const API = ADMIN_API_BASE;

const FILTER_TABS = [
  { value: '', label: 'Semua' },
  { value: 'active', label: 'Aktif' },
  { value: 'taken_down', label: 'Ditarik' },
  { value: 'pending', label: 'Pending' },
];

const fmtCurrency = (value) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
}).format(value || 0);

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatTime = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStatusConfig = (status) => {
  const map = {
    active: {
      label: 'Aktif',
      className: 'products-admin__status products-admin__status--active',
      actionLabel: 'Tarik dari toko',
      actionIcon: 'bx-hide',
    },
    taken_down: {
      label: 'Ditarik',
      className: 'products-admin__status products-admin__status--taken-down',
      actionLabel: 'Aktifkan kembali',
      actionIcon: 'bx-show',
    },
    pending: {
      label: 'Pending',
      className: 'products-admin__status products-admin__status--pending',
      actionLabel: 'Aktifkan produk',
      actionIcon: 'bx-show',
    },
  };

  return map[status] || {
    label: status || 'Unknown',
    className: 'products-admin__status',
    actionLabel: 'Ubah status',
    actionIcon: 'bx-transfer',
  };
};

const ProductMedia = ({ product }) => (
  <div className="products-admin__product">
    <img
      className="products-admin__thumb"
      src={formatImage(product.image) || `https://ui-avatars.com/api/?name=${encodeURIComponent(product.name || 'Produk')}&background=e5eefc&color=1d4ed8&size=100`}
      alt={product.name}
    />
    <div className="min-w-0">
      <div className="products-admin__product-name">{product.name}</div>
      <div className="products-admin__product-meta">SKU #{String(product.id).slice(0, 8).toUpperCase()}</div>
    </div>
  </div>
);

const ProductActions = ({ product, onToggleStatus, onDelete }) => {
  const statusConfig = getStatusConfig(product.status);

  return (
    <div className="dropdown">
      <button
        className="btn btn-sm btn-outline-secondary dropdown-toggle products-admin__action-toggle"
        type="button"
        data-bs-toggle="dropdown"
      >
        Kelola
      </button>
      <ul className="dropdown-menu dropdown-menu-end shadow-sm products-admin__action-menu">
        <li><h6 className="dropdown-header">Aksi Produk</h6></li>
        <li>
          <Link to={`/admin/products/edit?id=${product.id}`} className="dropdown-item">
            <i className="bx bx-pencil me-2"></i>
            Edit detail
          </Link>
        </li>
        <li>
          <button className="dropdown-item" onClick={() => onToggleStatus(product.id, product.status)}>
            <i className={`bx ${statusConfig.actionIcon} me-2`}></i>
            {statusConfig.actionLabel}
          </button>
        </li>
        <li><hr className="dropdown-divider" /></li>
        <li>
          <button className="dropdown-item text-danger" onClick={() => onDelete(product.id)}>
            <i className="bx bx-trash me-2"></i>
            Hapus produk
          </button>
        </li>
      </ul>
    </div>
  );
};

export default function AdminProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const loadProducts = () => {
    setLoading(true);
    fetchJson(`${API}/products?status=${statusFilter}&search=${search}`)
      .then((data) => setProducts(data.data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProducts();
  }, [statusFilter]);

  const deleteProduct = (id) => {
    if (!window.confirm('Hapus produk ini secara permanen?')) return;

    setLoading(true);
    fetchJson(`${API}/products/delete?id=${id}`, { method: 'DELETE' })
      .then(() => loadProducts())
      .catch((err) => {
        alert(err.message);
        setLoading(false);
      });
  };

  const toggleStatus = (id, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'taken_down' : 'active';

    setLoading(true);
    fetchJson(`${API}/products/moderate`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: nextStatus, note: 'Toggled via Super Admin' }),
    })
      .then(() => loadProducts())
      .catch((err) => {
        alert(err.message);
        setLoading(false);
      });
  };

  const stats = useMemo(() => ({
    total: products.length,
    active: products.filter((item) => item.status === 'active').length,
    takenDown: products.filter((item) => item.status === 'taken_down').length,
    pending: products.filter((item) => item.status === 'pending').length,
  }), [products]);

  return (
    <div className="products-admin-page fade-in">
      <section className="products-admin__hero card border-0 shadow-sm">
        <div className="products-admin__hero-copy">
          <div className="products-admin__eyebrow">Catalog Operations</div>
          <h1 className="products-admin__title">Kelola produk dengan alur CRUD yang lebih rapi</h1>
          <p className="products-admin__subtitle">
            Pantau status katalog, lakukan edit cepat, tarik produk dari toko, atau tambah listing baru dari satu workspace.
          </p>
        </div>
        <div className="products-admin__hero-actions">
          <button type="button" className="btn btn-light products-admin__ghost-btn" onClick={loadProducts}>
            <i className="bx bx-refresh"></i>
            Refresh
          </button>
          <Link to="/admin/products/add" className="btn products-admin__primary-btn">
            <i className="bx bx-plus"></i>
            Tambah Produk
          </Link>
        </div>
      </section>

      <section className="row g-3 mb-4">
        {[
          { label: 'Total Produk', value: stats.total, tone: 'primary', icon: 'bx-package' },
          { label: 'Aktif', value: stats.active, tone: 'success', icon: 'bx-check-circle' },
          { label: 'Ditarik', value: stats.takenDown, tone: 'danger', icon: 'bx-hide' },
          { label: 'Pending', value: stats.pending, tone: 'warning', icon: 'bx-time' },
        ].map((item) => (
          <div className="col-6 col-xl-3" key={item.label}>
            <article className={`card border-0 shadow-sm products-admin__stat-card products-admin__stat-card--${item.tone}`}>
              <div className="products-admin__stat-icon">
                <i className={`bx ${item.icon}`}></i>
              </div>
              <div className="products-admin__stat-value">{item.value}</div>
              <div className="products-admin__stat-label">{item.label}</div>
            </article>
          </div>
        ))}
      </section>

      <section className="card border-0 shadow-sm products-admin__panel">
        <div className="products-admin__panel-top">
          <div>
            <div className="products-admin__panel-title">Product Catalog</div>
            <div className="products-admin__panel-subtitle">Ruang kerja utama untuk operasi tambah, edit, moderasi, dan hapus produk.</div>
          </div>
          <form
            className="products-admin__toolbar"
            onSubmit={(e) => {
              e.preventDefault();
              loadProducts();
            }}
          >
            <div className="products-admin__search">
              <i className="bx bx-search"></i>
              <input
                type="search"
                value={search}
                placeholder="Cari nama produk atau ID"
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-light products-admin__toolbar-btn">
              Terapkan
            </button>
          </form>
        </div>

        <div className="products-admin__filter-row">
          <div className="products-admin__chips">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                className={`products-admin__chip ${statusFilter === tab.value ? 'is-active' : ''}`}
                onClick={() => setStatusFilter(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="products-admin__result-note">
            {loading ? 'Memuat data...' : `${products.length} produk tampil`}
          </div>
        </div>

        {loading ? (
          <div className="products-admin__loading">
            <div className="spinner-border text-primary"></div>
            <span>Memuat katalog produk...</span>
          </div>
        ) : products.length === 0 ? (
          <div className="products-admin__empty">
            <i className="bx bx-package"></i>
            <h3>Katalog tidak menemukan hasil</h3>
            <p>Ubah filter, cari dengan kata kunci lain, atau tambahkan produk baru.</p>
            <Link to="/admin/products/add" className="btn products-admin__primary-btn">
              <i className="bx bx-plus"></i>
              Tambah Produk
            </Link>
          </div>
        ) : (
          <>
            <div className="products-admin__table-shell d-none d-xl-block">
              <table className="table align-middle mb-0">
                <thead>
                  <tr>
                    <th>Produk</th>
                    <th>Merchant</th>
                    <th>Kategori</th>
                    <th>Harga</th>
                    <th>Status</th>
                    <th>Ditambahkan</th>
                    <th className="text-end">CRUD</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const statusConfig = getStatusConfig(product.status);
                    return (
                      <tr key={product.id}>
                        <td><ProductMedia product={product} /></td>
                        <td>
                          <span className="products-admin__merchant-pill">
                            <i className="bx bx-store"></i>
                            {product.store_name || 'Official Store'}
                          </span>
                        </td>
                        <td>{product.category || <span className="text-muted">-</span>}</td>
                        <td>
                          <div className="products-admin__price">{fmtCurrency(product.price)}</div>
                          {!!product.old_price && product.old_price > product.price && (
                            <div className="products-admin__old-price">{fmtCurrency(product.old_price)}</div>
                          )}
                        </td>
                        <td><span className={statusConfig.className}>{statusConfig.label}</span></td>
                        <td>
                          <div className="products-admin__date">{formatDate(product.created_at)}</div>
                          <div className="products-admin__time">{formatTime(product.created_at)}</div>
                        </td>
                        <td className="text-end">
                          <ProductActions product={product} onToggleStatus={toggleStatus} onDelete={deleteProduct} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="d-grid gap-3 d-xl-none products-admin__mobile-list">
              {products.map((product) => {
                const statusConfig = getStatusConfig(product.status);
                return (
                  <article key={product.id} className="card border-0 shadow-sm products-admin__mobile-card">
                    <div className="card-body">
                      <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
                        <ProductMedia product={product} />
                        <ProductActions product={product} onToggleStatus={toggleStatus} onDelete={deleteProduct} />
                      </div>

                      <div className="products-admin__mobile-meta">
                        <div>
                          <span className="products-admin__meta-label">Merchant</span>
                          <span>{product.store_name || 'Official Store'}</span>
                        </div>
                        <div>
                          <span className="products-admin__meta-label">Kategori</span>
                          <span>{product.category || '-'}</span>
                        </div>
                        <div>
                          <span className="products-admin__meta-label">Harga</span>
                          <span className="products-admin__price">{fmtCurrency(product.price)}</span>
                        </div>
                        <div>
                          <span className="products-admin__meta-label">Status</span>
                          <span className={statusConfig.className}>{statusConfig.label}</span>
                        </div>
                        <div>
                          <span className="products-admin__meta-label">Ditambahkan</span>
                          <span>{formatDate(product.created_at)} • {formatTime(product.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
