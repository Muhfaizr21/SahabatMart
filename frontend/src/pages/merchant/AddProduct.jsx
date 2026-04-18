import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchJson, MERCHANT_API_BASE, formatImage, PUBLIC_API_BASE } from '../../lib/api';
import { PageHeader, A, FieldLabel } from '../../lib/adminStyles.jsx';

const CustomComboBox = ({ value, onChange, name, options, placeholder }) => {
  const [open, setOpen] = useState(false);
  const [filtered, setFiltered] = useState([]);
  
  useEffect(() => {
    if (!value) setFiltered(options.slice(0, 50));
    else setFiltered(options.filter(o => (o.name||'').toLowerCase().includes(value.toLowerCase())).slice(0, 50));
  }, [value, options]);

  return (
    <div style={{ position: 'relative' }}>
      <input 
        name={name} value={value} 
        onChange={(e) => { onChange(e); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        style={{...A.input, position: 'relative', zIndex: open ? 11 : 1}} 
        placeholder={placeholder} required 
      />
      {open && filtered.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, marginTop: 4, zIndex: 50, maxHeight: 200, overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
          {filtered.map((opt, i) => (
            <div 
              key={opt.id || i}
              style={{ padding: '10px 16px', fontSize: 13, cursor: 'pointer', borderBottom: i === filtered.length - 1 ? 'none' : '1px solid #f1f5f9', color: '#0f172a' }}
              onMouseDown={() => onChange({ target: { name, value: opt.name } })}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = '#transparent'}
            >
              {opt.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function AddEditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [formData, setFormData] = useState({
    name: '', slug: '', description: '', price: 0, stock: 0,
    category: '', brand: '', image: '', status: 'active'
  });
  const [variants, setVariants] = useState([]);

  useEffect(() => {
    fetchJson(`${PUBLIC_API_BASE}/categories`).then(res => setCategories(res.data || [])).catch(() => {});
    fetchJson(`${PUBLIC_API_BASE}/brands`).then(res => setBrands(res.data || [])).catch(() => {});

    if (isEdit) {
      setLoading(true);
      fetchJson(`${MERCHANT_API_BASE}/products`).then(data => {
        const product = data.find(p => p.id === id);
        if (product) {
          setFormData(product);
          setVariants(product.variants || []);
        }
      }).catch(console.error).finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'stock' ? Number(value) : value,
      slug: name === 'name' ? value.toLowerCase().replace(/[^a-z0-9]+/g, '-') : prev.slug
    }));
  };

  const addVariant = () => setVariants([...variants, { id: Date.now().toString(), name: '', sku: '', price: formData.price, stock: 0 }]);
  const removeVariant = (idx) => setVariants(variants.filter((_, i) => i !== idx));
  const handleVariantChange = (idx, field, value) => {
    const nov = [...variants];
    nov[idx][field] = field === 'price' || field === 'stock' ? Number(value) : value;
    setVariants(nov);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = isEdit ? `${MERCHANT_API_BASE}/products/update` : `${MERCHANT_API_BASE}/products/add`;
      await fetchJson(endpoint, {
        method: 'POST',
        body: JSON.stringify({ product: formData, variants })
      });
      alert(isEdit ? 'Produk berhasil diubah!' : 'Produk berhasil ditambah! Menunggu review admin.');
      navigate('/merchant/products');
    } catch (err) {
      alert('Gagal menyimpan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={A.page} className="fade-in">
      <PageHeader 
        title={isEdit ? 'Refine Masterpiece' : 'Create New Asset'} 
        subtitle="Define your luxury product's core identity."
      >
        <button style={A.btnGhost} onClick={() => navigate('/merchant/products')}>Discard Changes</button>
      </PageHeader>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: 32, paddingBottom: 40, alignItems: 'start' }}>
        
        {/* Left Column: Essential Info & Variants */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
           
           <div style={{ ...A.card, padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
             <div>
               <FieldLabel>Product Title</FieldLabel>
               <input name="name" value={formData.name} onChange={handleChange} style={A.input} placeholder="Nama produk unggulan Anda..." required />
             </div>

             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
               <div>
                 <FieldLabel>Category</FieldLabel>
                 <CustomComboBox 
                   name="category"
                   value={formData.category}
                   onChange={handleChange}
                   options={categories}
                   placeholder="Pilih atau ketik kategori baru..."
                 />
               </div>
               <div>
                 <FieldLabel>Brand</FieldLabel>
                 <CustomComboBox 
                   name="brand"
                   value={formData.brand}
                   onChange={handleChange}
                   options={brands}
                   placeholder="Pilih atau ketik brand baru..."
                 />
               </div>
             </div>

             <div>
               <FieldLabel>Description</FieldLabel>
               <textarea name="description" value={formData.description} onChange={handleChange} style={{ ...A.input, minHeight: 120, resize: 'none' }} placeholder="Ceritakan kisah di balik produk ini..." />
             </div>
           </div>

           <div style={{ ...A.card, padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin:0 }}>Product Variants</h3>
               <button type="button" style={{ ...A.btnGhost, color:'#4f46e5' }} onClick={addVariant}>
                 <i className="bx bx-plus" /> Add Variation
               </button>
             </div>

             <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
               {variants.length === 0 ? (
                 <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No variations currently defined.</div>
               ) : variants.map((v, i) => (
                 <div key={v.id || i} style={{ display: 'flex', gap: 16, padding: 20, background: '#f8fafc', borderRadius: 16, border: '1px solid #f1f5f9' }}>
                   <div style={{ flex: 2 }}>
                     <input placeholder="Name (e.g. Red, XL)" value={v.name} onChange={e => handleVariantChange(i, 'name', e.target.value)} style={A.input} />
                   </div>
                   <div style={{ flex: 1 }}>
                     <input type="number" placeholder="Price" value={v.price} onChange={e => handleVariantChange(i, 'price', e.target.value)} style={A.input} />
                   </div>
                   <div style={{ flex: 1 }}>
                     <input type="number" placeholder="Stock" value={v.stock} onChange={e => handleVariantChange(i, 'stock', e.target.value)} style={A.input} />
                   </div>
                   <button type="button" style={{ ...A.btnGhost, padding: '0 16px', color: '#ef4444' }} onClick={() => removeVariant(i)}>
                     <i className="bx bx-trash" />
                   </button>
                 </div>
               ))}
             </div>
           </div>

        </div>

        {/* Right Column: Visuals & Pricing */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
           
           <div style={{ ...A.card, padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
             <div style={{ textAlign: 'center' }}>
               <FieldLabel>Main Asset Visualization</FieldLabel>
             </div>
             
             <div style={{ 
               aspectRatio: '1', borderRadius: 24, background: '#f8fafc', 
               border: '2px dashed #cbd5e1', position: 'relative', overflow: 'hidden',
               display: 'flex', alignItems: 'center', justifyContent: 'center'
             }}>
               {formData.image ? (
                 <img src={formatImage(formData.image)} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
               ) : (
                 <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                   <i className="bx bx-image-add" style={{ fontSize: 40, marginBottom: 8 }} />
                   <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>Select Image</div>
                 </div>
               )}
               <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
                 <input 
                   type="text" name="image" value={formData.image} onChange={handleChange} 
                   placeholder="Enter Image URL" 
                   style={{ ...A.input, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
                 />
               </div>
             </div>
             <p style={{ fontSize: 10, textAlign: 'center', color: '#94a3b8', margin: 0 }}>Supported formats: JPG, PNG, WEBP. Max size: 2MB.</p>
           </div>

           <div style={{ ...A.card, padding: 32, background: '#0f172a', color: '#fff', border: 'none', position: 'relative', overflow: 'hidden' }}>
             <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', gap: 24 }}>
               
               <div>
                 <label style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.4)', marginBottom: 8, display: 'block' }}>Base Valuation (Rp)</label>
                 <input 
                   name="price" type="number" value={formData.price} onChange={handleChange} required
                   style={{ boxSizing: 'border-box', width: '100%', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 16, padding: '16px 24px', fontSize: 24, fontWeight: 800, color: '#fff', outline: 'none' }}
                 />
               </div>
               
               <div>
                 <label style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.4)', marginBottom: 8, display: 'block' }}>Starting Stock Units</label>
                 <input 
                   name="stock" type="number" value={formData.stock} onChange={handleChange} required
                   style={{ boxSizing: 'border-box', width: '100%', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 16, padding: '16px 24px', fontSize: 20, fontWeight: 800, color: '#fff', outline: 'none' }}
                 />
               </div>
               
               <button type="submit" disabled={loading} style={{ 
                 width: '100%', padding: '20px', background: 'linear-gradient(135deg, #6366f1, #4338ca)', color: '#fff',
                 borderRadius: 16, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, border: 'none',
                 cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 16, boxShadow: '0 10px 20px rgba(79,70,229,0.3)'
               }}>
                 {loading ? 'Processing...' : isEdit ? 'Finalize Updates' : 'Publish Masterpiece'}
               </button>

             </div>
             
             {/* Decorative glow */}
             <div style={{ position: 'absolute', top: '-50%', right: '-20%', width: 250, height: 250, background: 'rgba(99,102,241,0.3)', borderRadius: '50%', filter: 'blur(80px)' }} />
           </div>

        </div>
      </form>
    </div>
  );
}
