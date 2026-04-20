import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson, formatImage } from '../../lib/api';
import { A } from '../../lib/adminStyles';

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
    id: '', name: '', description: '', price: 0, old_price: 0,
    category: '', brand: '', attributes: '{}', image: '',
    images: '[]', stock: 0, status: 'active'
  });

  const [gallery, setGallery] = useState([]);
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
      setCategories(Array.isArray(cats) ? cats : (cats.data || []));
      setBrands(Array.isArray(brds) ? brds : (brds.data || []));
      setAttrs(Array.isArray(atts) ? atts : (atts.data || []));
      
      const items = Array.isArray(prod) ? prod : (prod.data || []);
      const item = items.find(x => x.id === productId);
      if (item) {
        setP({
            id: item.id, name: item.name, description: item.description || '',
            price: item.price, old_price: item.old_price || 0,
            category: item.category, brand: item.brand || '',
            attributes: item.attributes || '{}', image: item.image,
            images: item.images || '[]', stock: item.stock || 100,
            status: item.status
        });
        try {
           setSelectedAttrs(JSON.parse(item.attributes || '{}'));
           setGallery(JSON.parse(item.images || '[]'));
        } catch(e) { 
           setSelectedAttrs({}); 
           setGallery([]);
        }
      }
    }).finally(() => setLoading(false));
  }, [productId]);

  const handleAttrChange = (name, val, checked) => {
    setSelectedAttrs(prev => {
      const currentVals = Array.isArray(prev[name]) ? prev[name] : [];
      let nextVals = checked ? [...currentVals, val] : currentVals.filter(v => v !== val);
      const next = { ...prev, [name]: nextVals };
      setP(pPrev => ({ ...pPrev, attributes: JSON.stringify(next) }));
      return next;
    });
  };

  const handleUpload = async (e, type = 'main') => {
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
      if (data.url) {
        if (type === 'main') {
           setP(prev => ({ ...prev, image: data.url }));
        } else {
           setGallery(prev => {
             const next = [...prev, data.url];
             setP(pPrev => ({ ...pPrev, images: JSON.stringify(next) }));
             return next;
           });
        }
      }
    } catch (err) { alert("Upload gagal: " + err.message); }
    finally { setUploading(false); }
  };

  const removeGalleryImage = (idx) => {
     setGallery(prev => {
       const next = prev.filter((_, i) => i !== idx);
       setP(pPrev => ({ ...pPrev, images: JSON.stringify(next) }));
       return next;
     });
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

  if (loading) return (
    <div style={{ padding: 100, textAlign: 'center' }}>
      <div style={{ width: 40, height: 40, border: '4px solid #f3f3f3', borderTop: '4px solid #4361ee', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ padding: '0 20px 40px' }} className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b', marginBottom: 6 }}>
            <Link to="/admin" style={{ color: 'inherit', textDecoration: 'none' }}>Dashboard</Link>
            <i className="bx bx-chevron-right" />
            <Link to="/admin/products" style={{ color: 'inherit', textDecoration: 'none' }}>Products</Link>
            <i className="bx bx-chevron-right" />
            <span style={{ fontWeight: 600, color: '#1e293b' }}>Edit SKU</span>
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
            Modifier: {p.name || 'Loading SKU...'}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => navigate('/admin/products')} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', fontSize: 13, fontWeight: 600, color: '#64748b', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#4361ee', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', boxShadow: '0 4px 12px rgba(67, 97, 238, 0.25)' }}>
            {saving ? 'Saving...' : 'Commit Changes'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        
        {/* Left Column: Basic Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Card 1: Core Info */}
          <div style={{ ...A.card, padding: 25 }}>
            <h5 style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="bx bx-info-circle" style={{ color: '#4361ee' }} /> Basic Information
            </h5>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.02em' }}>Product Name</label>
                <input 
                  type="text" 
                  value={p.name} 
                  onChange={e => setP({...p, name: e.target.value})}
                  placeholder="E.g. Professional Wireless Headset"
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, fontWeight: 600, color: '#1e293b', outline: 'none' }} 
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.02em' }}>Description (Long Format)</label>
                <textarea 
                  value={p.description} 
                  onChange={e => setP({...p, description: e.target.value})}
                  rows={8}
                  placeholder="Enrich your product detail here..."
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, color: '#475569', outline: 'none', lineHeight: 1.6, resize: 'vertical' }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Attributes */}
          <div style={{ ...A.card, padding: 25 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h5 style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="bx bx-list-check" style={{ color: '#4361ee' }} /> Global Attributes
              </h5>
              <Link to="/admin/attributes" style={{ fontSize: 11, fontWeight: 700, color: '#4361ee', textDecoration: 'none' }}>Manage Options <i className="bx bx-right-arrow-alt" /></Link>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {attrs.map(a => (
                <div key={a.id}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>{a.name}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {a.values?.split(',').map((v, idx) => {
                      const val = v.trim();
                      const isChecked = Array.isArray(selectedAttrs[a.name]) && selectedAttrs[a.name].includes(val);
                      return (
                        <label key={idx} style={{ 
                          padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          background: isChecked ? '#4361ee' : '#f8fafc',
                          color: isChecked ? '#fff' : '#64748b',
                          border: `1.5px solid ${isChecked ? '#4361ee' : '#e2e8f0'}`,
                          transition: 'all 0.15s'
                        }}>
                          <input type="checkbox" style={{ display: 'none' }} checked={isChecked} onChange={e => handleAttrChange(a.name, val, e.target.checked)} />
                          {val}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Organization & Media */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Organization */}
          <div style={{ ...A.card, padding: 20 }}>
             <h5 style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 16 }}>Market Setup</h5>
             <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Category</label>
                  <select style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 600 }} value={p.category} onChange={e => setP({...p, category: e.target.value})}>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Brand</label>
                  <select style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 600 }} value={p.brand} onChange={e => setP({...p, brand: e.target.value})}>
                    <option value="">-- No Specific Brand --</option>
                    {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Status</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" onClick={() => setP({...p, status: 'active'})} style={{ flex: 1, padding: '8px', borderRadius: 6, fontSize: 12, fontWeight: 700, border: '1px solid #e2e8f0', background: p.status === 'active' ? '#dcfce7' : '#fff', color: p.status === 'active' ? '#166534' : '#64748b' }}>Active</button>
                    <button type="button" onClick={() => setP({...p, status: 'taken_down'})} style={{ flex: 1, padding: '8px', borderRadius: 6, fontSize: 12, fontWeight: 700, border: '1px solid #e2e8f0', background: p.status === 'taken_down' ? '#fee2e2' : '#fff', color: p.status === 'taken_down' ? '#991b1b' : '#64748b' }}>Pulled</button>
                  </div>
                </div>
             </div>
          </div>

          {/* Pricing */}
          <div style={{ ...A.card, padding: 20, background: '#f5f7ff' }}>
             <h5 style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 16 }}>Financials</h5>
             <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                   <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Main Price (IDR)</label>
                   <input type="number" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 15, fontWeight: 800, color: '#4361ee' }} value={p.price} onChange={e => setP({...p, price: parseFloat(e.target.value)})} />
                </div>
                <div>
                   <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Strike Price (Discount)</label>
                   <input type="number" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, fontWeight: 600, color: '#64748b' }} value={p.old_price} onChange={e => setP({...p, old_price: parseFloat(e.target.value)})} />
                </div>
                <div>
                   <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Stock Count</label>
                   <input type="number" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, fontWeight: 700 }} value={p.stock} onChange={e => setP({...p, stock: parseInt(e.target.value)})} />
                </div>
             </div>
          </div>

          {/* Media */}
          <div style={{ ...A.card, padding: 20 }}>
             <h5 style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 16 }}>Primary Media</h5>
             <div style={{ border: '2px dashed #f1f5f9', borderRadius: 12, padding: 10, textAlign: 'center', position: 'relative' }}>
                <img src={formatImage(p.image)} style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8 }} alt="Main" />
                <label style={{ position: 'absolute', bottom: 15, right: 15, width: 32, height: 32, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
                   {uploading ? <div style={{ width: 14, height: 14, border: '2px solid #eee', borderTop: '2px solid #4361ee', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} /> : <i className="bx bx-camera" style={{ fontSize: 18, color: '#64748b' }} />}
                   <input type="file" style={{ display: 'none' }} accept="image/*" onChange={e => handleUpload(e, 'main')} />
                </label>
             </div>
             
             <h5 style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginTop: 20, marginBottom: 10 }}>Gallery</h5>
             <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {gallery.map((img, idx) => (
                  <div key={idx} style={{ position: 'relative', width: 64, height: 64 }}>
                    <img src={formatImage(img)} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: '1px solid #f1f5f9' }} alt="" />
                    <button onClick={() => removeGalleryImage(idx)} style={{ position: 'absolute', top: -5, right: -5, width: 18, height: 18, borderRadius: '50%', background: '#ff4d4f', border: 'none', color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="bx bx-x" /></button>
                  </div>
                ))}
                <label style={{ width: 64, height: 64, borderRadius: 8, border: '2px dashed #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94a3b8' }}>
                   <i className="bx bx-plus" style={{ fontSize: 20 }} />
                   <input type="file" style={{ display: 'none' }} accept="image/*" onChange={e => handleUpload(e, 'gallery')} />
                </label>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
