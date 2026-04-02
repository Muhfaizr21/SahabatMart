import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const API = 'http://localhost:8080/api/admin';

const AdminAddProduct = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    old_price: 0,
    category: '',
    image: '',
    stock: 100,
    status: 'active'
  });

  useEffect(() => {
    fetch(`${API}/categories`)
      .then(r => r.json())
      .then(d => setCategories(d.data || []));
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 'active' : 'draft') : 
               (name === 'price' || name === 'old_price' || name === 'stock' ? parseFloat(value) : value)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    fetch(`${API}/products/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
    .then(r => r.json())
    .then(() => {
      alert("Produk berhasil ditambahkan!");
      navigate('/admin/products');
    })
    .catch(err => alert("Gagal menambah produk: " + err.message));
  };

  return (
    <>
      <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
        <div className="breadcrumb-title pe-3">SahabatMart</div>
        <div className="ps-3">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0 p-0">
              <li className="breadcrumb-item"><Link to="/admin"><i className="bx bx-home-alt"></i></Link></li>
              <li className="breadcrumb-item"><Link to="/admin/products">Produk</Link></li>
              <li className="breadcrumb-item active" aria-current="page">Tambah Produk Baru</li>
            </ol>
          </nav>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-8 mx-auto">
          <div className="card shadow-sm border-0">
            <div className="card-header py-3 bg-white"> 
              <h5 className="mb-0 fw-bold text-dark">Informasi Produk</h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit} className="row g-3">
                <div className="col-12">
                  <label className="form-label fw-semibold">Nama Produk</label>
                  <input type="text" name="name" className="form-control" placeholder="Contoh: Lampu LED Pintar" required value={formData.name} onChange={handleChange} />
                </div>
                <div className="col-12">
                  <label className="form-label fw-semibold">Deskripsi Lengkap</label>
                  <textarea name="description" className="form-control" placeholder="Jelaskan detail produk..." rows="4" value={formData.description} onChange={handleChange}></textarea>
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label fw-semibold">Kategori</label>
                  <select name="category" className="form-select" value={formData.category} onChange={handleChange}>
                    <option value="">Pilih Kategori</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label fw-semibold">URL Gambar</label>
                  <input type="text" name="image" className="form-control" placeholder="https://..." value={formData.image} onChange={handleChange} />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Harga (IDR)</label>
                  <input type="number" name="price" className="form-control" placeholder="0" value={formData.price} onChange={handleChange} />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Harga Lama (Coret)</label>
                  <input type="number" name="old_price" className="form-control" placeholder="0" value={formData.old_price} onChange={handleChange} />
                </div>
                <div className="col-12">
                  <div className="form-check form-switch">
                    <input className="form-check-input" type="checkbox" name="status" id="publishCheck" checked={formData.status === 'active'} onChange={handleChange} />
                    <label className="form-check-label" htmlFor="publishCheck">Langsung tampilkan di toko (Active)</label>
                  </div>
                </div>
                <div className="col-12 pt-3">
                  <button type="submit" className="btn btn-primary px-5 rounded-pill shadow-sm">Simpan Produk</button>
                  <Link to="/admin/products" className="btn btn-light px-5 rounded-pill ms-2">Batal</Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminAddProduct;
