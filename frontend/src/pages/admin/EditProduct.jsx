import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';

const API = ADMIN_API_BASE;

export default function AdminEditProduct() {
  const navigate = useNavigate();
  const location = useLocation();
  const productId = new URLSearchParams(location.search).get('id');

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [attrs, setAttrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [p, setP] = useState({
    id: '',
    name: '',
    description: '',
    price: 0,
    old_price: 0,
    category: '',
    brand: '',
    attributes: '{}',
    image: '',
    stock: 0,
    status: 'active'
  });

  const [selectedAttrs, setSelectedAttrs] = useState({});

  useEffect(() => {
    if (!productId) return;

    setLoading(true);
    Promise.all([
      fetchJson(`${API}/categories`),
      fetchJson(`${API}/brands`),
      fetchJson(`${API}/attributes`),
      fetchJson(`${API}/products?search=${productId}`)
    ]).then(([cats, brds, atts, prod]) => {
      setCategories(cats.data || []);
      setBrands(brds.data || []);
      setAttrs(atts.data || []);
      
      const item = prod.data?.find(x => x.id === productId);
      if (item) {
        setP({
            id: item.id,
            name: item.name,
            description: item.description || '',
            price: item.price,
            old_price: item.old_price || 0,
            category: item.category,
            brand: item.brand || '',
            attributes: item.attributes || '{}',
            image: item.image,
            stock: item.stock || 100,
            status: item.status
        });
        try {
           setSelectedAttrs(JSON.parse(item.attributes || '{}'));
        } catch(e) { setSelectedAttrs({}); }
      }
    }).finally(() => setLoading(false));
  }, [productId]);

  const handleAttrChange = (name, val) => {
    const next = { ...selectedAttrs, [name]: val };
    setSelectedAttrs(next);
    setP({ ...p, attributes: JSON.stringify(next) });
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);
    try {
      const resp = await fetch(`${API}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });
      const data = await resp.json();
      if (data.url) setP({ ...p, image: data.url });
    } catch (err) { alert("Upload gagal: " + err.message); }
    finally { setUploading(false); }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaving(true);
    fetchJson(`${API}/products/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p)
    })
    .then(() => navigate('/admin/products'))
    .catch(err => alert("Gagal update: " + err.message))
    .finally(() => setSaving(false));
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

  return (
    <div className="fade-in px-3 pb-5">
       <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-4">
        <div className="breadcrumb-title pe-3 border-0 h5 mb-0 fw-bold underline-none">Product Modifier</div>
        <div className="ps-3 border-start">
          <nav><ol className="breadcrumb mb-0 p-0 bg-transparent">
            <li className="breadcrumb-item"><Link to="/admin" className="text-decoration-none"><i className="bx bx-home-alt text-muted"></i></Link></li>
            <li className="breadcrumb-item active text-muted small">Update SKU Information</li>
          </ol></nav>
        </div>
      </div>

      <div className="row g-4 mt-2">
        <div className="col-12 col-xl-10 mx-auto">
          <div className="card shadow-sm border-0 radius-20 overflow-hidden bg-white">
             <div className="card-header py-4 px-4 bg-white border-bottom-0">
                <div className="d-flex align-items-center gap-3">
                   <div className="icon-box-sm bg-primary text-white rounded-circle"><i className="bx bx-edit-alt fs-4"></i></div>
                   <div>
                      <h5 className="mb-0 fw-bold">Update Master Catalog Record</h5>
                      <p className="mb-0 x-small text-muted fw-bold font-monospace letter-spacing-1 text-uppercase opacity-75">ID: {p.id}</p>
                   </div>
                </div>
             </div>
             <div className="card-body p-4 pt-0">
                <form onSubmit={handleSubmit} className="row g-4">
                   <div className="col-md-12">
                      <label className="form-label x-small fw-bold text-muted text-uppercase mb-2">Nama Produk Lengkap</label>
                      <input type="text" className="form-control radius-12 border-0 bg-light py-2 fw-bold" placeholder="E.g. Apple MacBook M3 Pro" required value={p.name} onChange={e => setP({...p, name: e.target.value})} />
                   </div>
                   
                   <div className="col-md-12">
                      <label className="form-label x-small fw-bold text-muted text-uppercase mb-2">Deskripsi Produk (Detail)</label>
                      <textarea className="form-control radius-15 border-0 bg-light py-3" placeholder="Enrich your product with details..." rows="3" value={p.description} onChange={e => setP({...p, description: e.target.value})}></textarea>
                   </div>

                   {/* Preview Center */}
                   <div className="col-md-6 text-center my-2 mx-auto">
                      <div className="p-1 border-dashed radius-15 d-inline-block bg-white shadow-sm border-primary border-opacity-25">
                        <img src={p.image || 'https://via.placeholder.com/150'} className="radius-12" style={{width: 180, height: 180, objectFit:'cover'}} alt="Preview" />
                      </div>
                   </div>

                   {/* Master Data Row */}
                   <div className="col-md-4">
                      <label className="form-label x-small fw-bold text-muted text-uppercase mb-2">Kategori Induk</label>
                      <select className="form-select radius-12 border-0 bg-light py-2 fw-medium" value={p.category} onChange={e => setP({...p, category: e.target.value})}>
                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                   </div>
                   <div className="col-md-4">
                      <label className="form-label x-small fw-bold text-muted text-uppercase mb-2">Brand / Merk</label>
                      <select className="form-select radius-12 border-0 bg-light py-2 fw-medium" value={p.brand} onChange={e => setP({...p, brand: e.target.value})}>
                        <option value="">-- No Specific Brand --</option>
                        {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                      </select>
                   </div>
                   <div className="col-md-4">
                      <label className="form-label x-small fw-bold text-muted text-uppercase mb-2">Stok Tersedia</label>
                      <input type="number" className="form-control radius-12 border-0 bg-light py-2 fw-bold" value={p.stock} onChange={e => setP({...p, stock: parseInt(e.target.value)})} />
                   </div>

                   {/* Attributes Section */}
                   <div className="col-12 mt-3">
                      <div className="bg-light p-4 radius-15 border border-white">
                         <h6 className="fw-bold mb-3 small"><i className="bx bx-list-check me-1 text-primary"></i> Global Attributes (Master Setup)</h6>
                         <div className="row g-3">
                            {attrs.length === 0 ? <p className="x-small text-muted mb-0">No global attributes found in platform settings.</p> : 
                            attrs.map(a => (
                               <div key={a.id} className="col-md-4">
                                  <label className="form-label x-small fw-bold opacity-75">{a.name.toUpperCase()}</label>
                                  <select className="form-select form-select-sm radius-10 border-0 shadow-sm" style={{fontSize: 12}} 
                                    value={selectedAttrs[a.name] || ''}
                                    onChange={e => handleAttrChange(a.name, e.target.value)}>
                                     <option value="">Select...</option>
                                     {a.values?.split(',').map(v => <option key={v} value={v.trim()}>{v.trim()}</option>)}
                                  </select>
                               </div>
                            ))}
                         </div>
                      </div>
                   </div>
                   
                   <div className="col-md-6">
                      <label className="form-label x-small fw-bold text-muted text-uppercase mb-2">Display Asset (URL or File Lokal)</label>
                      <div className="input-group">
                         <span className="input-group-text border-0 radius-left-12 bg-light"><i className="bx bx-image-add"></i></span>
                         <input type="text" className="form-control border-0 bg-light py-2" placeholder="https://..." value={p.image} onChange={e => setP({ ...p, image: e.target.value })} />
                         <label className="btn btn-light border-0 radius-right-12 px-3 m-0 d-flex align-items-center" style={{ cursor: 'pointer' }}>
                            {uploading ? <div className="spinner-border spinner-border-sm"></div> : <i className="bx bx-upload fs-5"></i>}
                            <input type="file" className="d-none" accept="image/*" onChange={handleUpload} />
                         </label>
                      </div>
                   </div>

                   <div className="col-md-3">
                      <label className="form-label x-small fw-bold text-muted text-uppercase mb-2">Harga Jual (IDR)</label>
                      <input type="number" className="form-control radius-12 border-0 bg-light py-2 fw-bold text-primary" value={p.price} onChange={e => setP({...p, price: parseFloat(e.target.value)})} />
                   </div>
                   <div className="col-md-3">
                      <label className="form-label x-small fw-bold text-muted text-uppercase mb-2">Harga Coret (Optional)</label>
                      <input type="number" className="form-control radius-12 border-0 bg-light py-2 text-muted" value={p.old_price} onChange={e => setP({...p, old_price: parseFloat(e.target.value)})} />
                   </div>

                   <div className="col-12 pt-3">
                      <div className="bg-light p-3 radius-15 d-flex align-items-center justify-content-between border border-white">
                         <div className="d-flex align-items-center gap-2 text-success">
                            <i className="bx bx-check-circle fs-4"></i>
                            <span className="small fw-bold">Live Status (Market Visibility)</span>
                         </div>
                         <div className="form-check form-switch mb-0">
                            <input className="form-check-input" style={{width:'3.5em', height:'1.7em'}} type="checkbox" checked={p.status === 'active'} onChange={e => setP({...p, status: e.target.checked?'active':'taken_down'})} />
                         </div>
                      </div>
                   </div>
                   
                   <div className="col-12 pt-4 d-flex gap-2">
                       <button type="submit" className="btn btn-primary radius-10 px-5 shadow-sm fw-bold border-0 py-2" disabled={saving}>
                          {saving ? <div className="spinner-border spinner-border-sm me-2"></div> : <i className="bx bx-save me-2"></i>}
                          Commit Sync
                       </button>
                       <Link to="/admin/products" className="btn btn-light radius-10 px-4 text-muted fw-bold">Discard</Link>
                   </div>
                </form>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
