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

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [attrs, setAttrs] = useState([]);
  const [formData, setFormData] = useState({
    name: '', slug: '', description: '', price: 0, old_price: 0, stock: 0, weight: 0,
    category: '', brand: '', image: '', images: '[]', attributes: '{}', status: 'active'
  });
  const [gallery, setGallery] = useState([]);
  const [selectedAttrs, setSelectedAttrs] = useState({});
  const [variants, setVariants] = useState([]);

  useEffect(() => {
    // Load Master Data
    Promise.all([
      fetchJson(`${PUBLIC_API_BASE}/categories`),
      fetchJson(`${PUBLIC_API_BASE}/brands`),
      fetchJson(`${ADMIN_API_BASE}/attributes`)
    ]).then(([c, b, a]) => {
      setCategories(c || []);
      setBrands(b || []);
      setAttrs(a.data || []);
    });

    if (isEdit) {
      setLoading(true);
      fetchJson(`${MERCHANT_API_BASE}/products`).then(data => {
        const product = data.find(p => p.id === id);
        if (product) {
          setFormData({
            ...product,
            images: product.images || '[]',
            attributes: product.attributes || '{}'
          });
          setVariants(product.variants || []);
          
          // Sync Gallery
          try { setGallery(JSON.parse(product.images || '[]')); } catch(e) { setGallery([]); }
          
          // Sync Attributes
          try { setSelectedAttrs(JSON.parse(product.attributes || '{}')); } catch(e) { setSelectedAttrs({}); }
        }
      }).catch(console.error).finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'old_price' || name === 'stock' || name === 'weight' ? Number(value) : value,
      slug: name === 'name' ? value.toLowerCase().replace(/[^a-z0-9]+/g, '-') : prev.slug
    }));
  };

  const handleAttrChange = (name, val, checked) => {
    setSelectedAttrs(prev => {
      const currentVals = Array.isArray(prev[name]) ? prev[name] : [];
      let nextVals;
      if (checked) {
        nextVals = [...currentVals, val];
      } else {
        nextVals = currentVals.filter(v => v !== val);
      }
      const next = { ...prev, [name]: nextVals };
      setFormData(prevForm => ({ ...prevForm, attributes: JSON.stringify(next) }));
      return next;
    });
  };

  const handleUpload = async (e, type = 'main') => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('image', file);
    try {
      const resp = await fetch(`${MERCHANT_API_BASE}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: fd
      });
      const data = await resp.json();
      if (data.url) {
        if (type === 'main') {
          setFormData(prev => ({ ...prev, image: data.url }));
        } else {
          setGallery(prev => {
            const next = [...prev, data.url];
            setFormData(pPrev => ({ ...pPrev, images: JSON.stringify(next) }));
            return next;
          });
        }
      }
    } catch (err) { alert('Upload gagal: ' + err.message); }
    finally { setUploading(false); }
  };

  const removeGalleryImage = (idx) => {
    setGallery(prev => {
      const next = prev.filter((_, i) => i !== idx);
      setFormData(pPrev => ({ ...pPrev, images: JSON.stringify(next) }));
      return next;
    });
  };

  const addVariant = () => setVariants([...variants, { id: Date.now().toString(), name: '', sku: '', price: formData.price, stock: 0, weight: formData.weight }]);
  const removeVariant = (idx) => setVariants(variants.filter((_, i) => i !== idx));
  const handleVariantChange = (idx, field, value) => {
    const nov = [...variants];
    nov[idx][field] = field === 'price' || field === 'stock' || field === 'weight' ? Number(value) : value;
    setVariants(nov);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
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
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 100, textAlign: 'center', color: '#94a3b8' }}>Memuat data produk...</div>;

  return (
    <div style={{ ...A.page, maxWidth: 1000 }} className="fade-in">
      <PageHeader 
        title={isEdit ? 'Perbarui Produk' : 'Tambah Produk Baru'} 
        subtitle="Tentukan identitas inti produk Anda."
      >
        <button style={A.btnGhost} onClick={() => navigate('/merchant/products')}>Batalkan Perubahan</button>
      </PageHeader>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: 32, paddingBottom: 40, alignItems: 'start' }}>
        
        {/* Left Column: Essential Info & Variants */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
           
           <div style={{ ...A.card, padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
             <div>
               <FieldLabel>Nama Produk</FieldLabel>
               <input name="name" value={formData.name} onChange={handleChange} style={A.input} placeholder="Nama produk unggulan Anda..." required />
             </div>

             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
               <div>
                 <FieldLabel>Kategori</FieldLabel>
                 <CustomComboBox 
                   name="category"
                   value={formData.category}
                   onChange={handleChange}
                   options={categories}
                   placeholder="Pilih atau ketik kategori baru..."
                 />
               </div>
               <div>
                 <FieldLabel>Merek</FieldLabel>
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
               <FieldLabel>Deskripsi</FieldLabel>
               <textarea name="description" value={formData.description} onChange={handleChange} style={{ ...A.input, minHeight: 120, resize: 'none' }} placeholder="Ceritakan kisah di balik produk ini..." />
             </div>
           </div>

           {/* Global Attributes Section */}
           {attrs.length > 0 && (
             <div style={{ ...A.card, padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin:0 }}>Spesifikasi Produk</h3>
                <div style={{ display: 'grid', gap: 16 }}>
                  {attrs.map(a => (
                    <div key={a.id}>
                      <label style={{ ...A.label, fontSize: 11, marginBottom: 8, display: 'block' }}>{a.name}</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {a.values?.split(',').map((v, idx) => {
                          const val = v.trim();
                          const isChecked = Array.isArray(selectedAttrs[a.name]) && selectedAttrs[a.name].includes(val);
                          return (
                            <label key={`${a.id}-${val}-${idx}`} style={{ 
                              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 10,
                              cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.2s',
                              background: isChecked ? '#eff6ff' : '#f8fafc',
                              color: isChecked ? '#2563eb' : '#64748b',
                              border: `1.5px solid ${isChecked ? '#2563eb' : '#e2e8f0'}`,
                            }}>
                              <input type="checkbox" checked={isChecked} onChange={e => handleAttrChange(a.name, val, e.target.checked)} style={{ display: 'none' }} />
                              {isChecked && <i className="bx bx-check" />}
                              {val}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
             </div>
           )}

           <div style={{ ...A.card, padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin:0 }}>Varian Produk</h3>
               <button type="button" style={{ ...A.btnGhost, color:'#4f46e5' }} onClick={addVariant}>
                 <i className="bx bx-plus" /> Tambah Varian
               </button>
             </div>

             <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
               {variants.length === 0 ? (
                 <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Belum ada varian yang ditentukan.</div>
               ) : variants.map((v, i) => (
                 <div key={v.id || i} style={{ display: 'flex', gap: 12, padding: 16, background: '#f8fafc', borderRadius: 16, border: '1px solid #f1f5f9' }}>
                   <div style={{ flex: 2 }}><input placeholder="Nama (cth: Merah, XL)" value={v.name} onChange={e => handleVariantChange(i, 'name', e.target.value)} style={A.input} /></div>
                   <div style={{ flex: 1 }}><input type="number" placeholder="Harga" value={v.price} onChange={e => handleVariantChange(i, 'price', e.target.value)} style={A.input} /></div>
                   <div style={{ flex: 1 }}><input type="number" placeholder="Berat (g)" value={v.weight} onChange={e => handleVariantChange(i, 'weight', e.target.value)} style={A.input} /></div>
                   <div style={{ flex: 1 }}><input type="number" placeholder="Stok" value={v.stock} onChange={e => handleVariantChange(i, 'stock', e.target.value)} style={A.input} /></div>
                   <button type="button" style={{ ...A.btnGhost, padding: '0 12px', color: '#ef4444' }} onClick={() => removeVariant(i)}><i className="bx bx-trash" /></button>
                 </div>
               ))}
             </div>
           </div>

        </div>

        {/* Right Column: Visuals & Pricing */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
           
           <div style={{ ...A.card, padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
             <FieldLabel>Visual Aset</FieldLabel>
             
             {/* Main Image */}
             <div style={{ 
                aspectRatio: '1.5', borderRadius: 20, background: '#f8fafc', 
                border: '2px dashed #cbd5e1', position: 'relative', overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
             }}>
               {formData.image ? (
                 <img src={formatImage(formData.image)} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
               ) : (
                 <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                   <i className="bx bx-image-add" style={{ fontSize: 32, marginBottom: 4 }} />
                   <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>Thumbnail Utama</div>
                 </div>
               )}
               <label style={{ position: 'absolute', bottom: 12, right: 12, width: 40, height: 40, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                 <i className="bx bx-upload" style={{ fontSize: 18, color: '#4f46e5' }} />
                 <input type="file" className="d-none" accept="image/*" onChange={e => handleUpload(e, 'main')} />
               </label>
             </div>

             {/* Gallery */}
             <div>
                <FieldLabel style={{ marginBottom: 12 }}>Galeri Produk (Slides)</FieldLabel>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {gallery.map((img, idx) => (
                    <div key={idx} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', background: '#f1f5f9' }}>
                      <img src={formatImage(img)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      <button type="button" onClick={() => removeGalleryImage(idx)} style={{ position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: '50%', background: 'rgba(239,68,68,0.9)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <i className="bx bx-x" />
                      </button>
                    </div>
                  ))}
                  {gallery.length < 5 && (
                    <label style={{ aspectRatio: '1', borderRadius: 10, border: '1.5px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94a3b8' }}>
                      {uploading ? <div className="spinner-border spinner-border-sm" /> : <i className="bx bx-plus" style={{ fontSize: 20 }} />}
                      <input type="file" className="d-none" accept="image/*" onChange={e => handleUpload(e, 'gallery')} />
                    </label>
                  )}
                </div>
             </div>
           </div>

           <div style={{ ...A.card, padding: 32, background: '#0f172a', color: '#fff', border: 'none' }}>
             <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', marginBottom: 8, display: 'block' }}>HARGA (Rp)</label>
                  <input name="price" type="number" value={formData.price} onChange={handleChange} required style={{ width: '100%', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 12, padding: '12px 20px', fontSize: 22, fontWeight: 800, color: '#fff', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', marginBottom: 8, display: 'block' }}>HARGA CORET (Opsional)</label>
                  <input name="old_price" type="number" value={formData.old_price} onChange={handleChange} style={{ width: '100%', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 12, padding: '12px 20px', fontSize: 18, fontWeight: 600, color: 'rgba(255,255,255,0.6)', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', marginBottom: 8, display: 'block' }}>STOK TERSEDIA</label>
                  <input name="stock" type="number" value={formData.stock} onChange={handleChange} required style={{ width: '100%', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 12, padding: '12px 20px', fontSize: 18, fontWeight: 800, color: '#fff', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', marginBottom: 8, display: 'block' }}>BERAT (GRAM)</label>
                  <input name="weight" type="number" value={formData.weight} onChange={handleChange} required style={{ width: '100%', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 12, padding: '12px 20px', fontSize: 18, fontWeight: 800, color: '#fff', outline: 'none' }} />
                </div>
                
                <button type="submit" disabled={saving} style={{ 
                  width: '100%', padding: '18px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff',
                  borderRadius: 14, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, border: 'none',
                  cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, marginTop: 10
                }}>
                  {saving ? 'Memproses...' : isEdit ? 'Simpan Perubahan' : 'Tambah Produk'}
                </button>
             </div>
           </div>

        </div>
      </form>
    </div>
  );
}
