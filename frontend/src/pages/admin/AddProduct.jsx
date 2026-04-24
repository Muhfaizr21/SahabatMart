import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson, formatImage } from '../../lib/api';

const API = ADMIN_API_BASE;

/* ─── Shared Style Tokens ────────────────────────────────── */
const S = {
  page: { fontFamily: "'Inter', sans-serif", maxWidth: 900, margin: '0 auto', paddingTop: 20 },
  label: { display: 'block', fontSize: 11.5, fontWeight: 700, color: '#64748b', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 6 },
  input: { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, color: '#334155', background: '#f8fafc', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border 0.2s' },
  select: { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, color: '#334155', background: '#f8fafc', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', appearance: 'auto' },
  textarea: { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, color: '#334155', background: '#f8fafc', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' },
  card: { background: '#fff', borderRadius: 16, border: '1px solid #f0f0f5', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.6px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 },
  divider: { height: 1, background: '#f1f5f9', margin: '24px 0' },
  btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 10, border: 'none', background: '#4361ee', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.15s' },
  btnSecondary: { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 14, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' },
};

const FormField = ({ label, children }) => (
  <div>
    <label style={S.label}>{label}</label>
    {children}
  </div>
);

export default function AdminAddProduct() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [attrs, setAttrs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [p, setP] = useState({
    name: '', sku: '', description: '', price: 0, old_price: 0, cogs: 0,
    category: '', brand: '', attributes: '{}', image: '', images: '[]', stock: 100, status: 'active'
  });
  const [gallery, setGallery] = useState([]);
  const [selectedAttrs, setSelectedAttrs] = useState({});

  useEffect(() => {
    Promise.all([
      fetchJson(`${API}/categories`),
      fetchJson(`${API}/brands`),
      fetchJson(`${API}/attributes`)
    ]).then(([c, b, a]) => {
      setCategories(c.data || []);
      setBrands(b.data || []);
      setAttrs(a.data || []);
      if (c.data?.length > 0) setP(prev => ({ ...prev, category: c.data[0].name }));
      if (b.data?.length > 0) setP(prev => ({ ...prev, brand: b.data[0].name }));
    });
  }, []);

  const handleAttrChange = (name, val, checked) => {
    console.log(`Attribute Change: ${name} -> ${val} (Checked: ${checked})`);
    setSelectedAttrs(prev => {
      const currentVals = Array.isArray(prev[name]) ? prev[name] : [];
      let nextVals;
      if (checked) {
        nextVals = [...currentVals, val];
      } else {
        nextVals = currentVals.filter(v => v !== val);
      }
      const next = { ...prev, [name]: nextVals };
      
      // Sync with main product state using functional update
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
    } catch (err) { alert('Upload gagal: ' + err.message); }
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
    fetchJson(`${API}/products/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p)
    })
    .then(() => navigate('/admin/products'))
    .catch(err => alert('Gagal: ' + err.message))
    .finally(() => setSaving(false));
  };

  const focusStyle = { borderColor: '#818cf8' };

  return (
    <div style={S.page} className="fade-in pb-5">
      {/* Breadcrumb */}
      <div className="d-none d-sm-flex align-items-center gap-2 mb-4">
        <Link to="/admin/products" style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', textDecoration: 'none' }}>Product Catalog</Link>
        <i className="bx bx-chevron-right" style={{ color: '#cbd5e1', fontSize: 20 }} />
        <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 500 }}>Tambah Produk Baru</span>
      </div>

      <div style={S.card}>
        {/* Card Header */}
        <div style={{ padding: '20px 28px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #4361ee, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#fff' }}>
            <i className="bx bx-package" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Konfigurasi Produk Baru</div>
            <div style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 2 }}>Direct storefront publishing · Isi semua detail dengan lengkap</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 28 }}>
          {/* Basic Info */}
          <div style={S.sectionTitle}>
            <i className="bx bx-info-circle" style={{ fontSize: 15 }} /> Informasi Dasar
          </div>
          <div style={{ display: 'grid', gap: 18 }}>
            <FormField label="Nama Produk Lengkap">
              <input style={S.input} type="text" placeholder="Contoh: Apple MacBook M3 Pro 14-inch" required
                value={p.name} onChange={e => setP(prev => ({ ...prev, name: e.target.value }))}
                onFocus={e => e.target.style.borderColor = '#818cf8'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            </FormField>
            <FormField label="Deskripsi Produk">
              <textarea style={{ ...S.textarea, minHeight: 90 }} rows={3} placeholder="Jelaskan fitur, spesifikasi, dan keunggulan produk..."
                value={p.description} onChange={e => setP(prev => ({ ...prev, description: e.target.value }))}
                onFocus={e => e.target.style.borderColor = '#818cf8'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            </FormField>
          </div>

          <div style={S.divider} />

          {/* Classification */}
          <div style={S.sectionTitle}>
            <i className="bx bx-category" style={{ fontSize: 15 }} /> Klasifikasi & Inventori
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 18 }}>
            <FormField label="Kategori">
              <select style={S.select} value={p.category} onChange={e => setP(prev => ({ ...prev, category: e.target.value }))}>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </FormField>
            <FormField label="Brand / Merek">
              <select style={S.select} value={p.brand} onChange={e => setP(prev => ({ ...prev, brand: e.target.value }))}>
                <option value="">— Tanpa Brand —</option>
                {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
              </select>
            </FormField>
            <FormField label="SKU / Kode Barcode">
              <input style={S.input} type="text" placeholder="Scan atau input SKU..."
                value={p.sku} onChange={e => setP(prev => ({ ...prev, sku: e.target.value }))}
                onFocus={e => e.target.style.borderColor = '#818cf8'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            </FormField>
            <FormField label="Stok Tersedia">
              <input style={S.input} type="number" min={0} value={p.stock}
                onChange={e => setP(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                onFocus={e => e.target.style.borderColor = '#818cf8'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            </FormField>
          </div>

          {/* Dynamic Attributes */}
          {attrs.length > 0 && (
            <>
              <div style={S.divider} />
              <div style={{ ...S.sectionTitle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="bx bx-list-check" style={{ fontSize: 15 }} /> Atribut Produk (Dinamis)
                </div>
                <button type="button" onClick={() => window.location.href='/admin/attributes'} 
                  style={{ padding: '4px 12px', borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 11, cursor: 'pointer', color: '#4361ee', fontWeight: 600 }}>
                  <i className="bx bx-cog" style={{ marginRight: 4 }} /> Kelola Master
                </button>
              </div>
              <div style={{ display: 'grid', gap: 14 }}>
                {attrs.map(a => (
                  <div key={a.id}>
                    <label style={S.label}>{a.name}</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, background: '#f8fafc', padding: '12px 16px', borderRadius: 12, border: '1.5px solid #e2e8f0' }}>
                      {a.values?.split(',').map((v, idx) => {
                        const val = v.trim();
                        const isChecked = Array.isArray(selectedAttrs[a.name]) && selectedAttrs[a.name].includes(val);
                        return (
                          <label key={`${a.id}-${val}-${idx}`} className="form-check-label" 
                            style={{ 
                              display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', 
                              fontSize: 12, fontWeight: 600, 
                              color: isChecked ? '#4361ee' : '#64748b',
                              background: isChecked ? 'rgba(67, 97, 238, 0.06)' : '#fff',
                              padding: '6px 14px', borderRadius: 10, transition: 'all 0.2s',
                              border: `1.5px solid ${isChecked ? '#4361ee' : '#e2e8f0'}`,
                              boxShadow: isChecked ? '0 2px 4px rgba(67, 97, 238, 0.1)' : 'none'
                            }}>
                            <input type="checkbox" checked={isChecked} onChange={e => handleAttrChange(a.name, val, e.target.checked)} 
                              style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
                            {isChecked && <i className="bx bx-check-circle" style={{ fontSize: 14 }} />}
                            <span>{val}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div style={S.divider} />

          {/* Media & Price */}
          <div style={S.sectionTitle}>
            <i className="bx bx-dollar-circle" style={{ fontSize: 15 }} /> Harga & Media
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 18, alignItems: 'start' }}>
            <FormField label="Harga Jual (IDR)">
              <input style={{ ...S.input, fontWeight: 700, color: '#4361ee' }} type="number" min={0} value={p.price}
                onChange={e => setP(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                onFocus={e => e.target.style.borderColor = '#818cf8'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            </FormField>
            <FormField label="Harga Coret (Opsional)">
              <input style={S.input} type="number" min={0} value={p.old_price}
                onChange={e => setP(prev => ({ ...prev, old_price: parseFloat(e.target.value) || 0 }))}
                onFocus={e => e.target.style.borderColor = '#818cf8'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            </FormField>
            <FormField label="Modal Awal / COGS (IDR)">
              <input style={{ ...S.input, color: '#ef4444', fontWeight: 600 }} type="number" min={0} value={p.cogs}
                onChange={e => setP(prev => ({ ...prev, cogs: parseFloat(e.target.value) || 0 }))}
                onFocus={e => e.target.style.borderColor = '#818cf8'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            </FormField>
            <FormField label="Thumbnail Utama">
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={{ ...S.input, flex: 1 }} type="text" placeholder="https://..." value={p.image}
                  onChange={e => setP(prev => ({ ...prev, image: e.target.value }))}
                  onFocus={e => e.target.style.borderColor = '#818cf8'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 10, background: '#f8fafc', border: '1.5px solid #e2e8f0', cursor: 'pointer', flexShrink: 0, color: '#64748b', fontSize: 20 }}>
                  {uploading ? <div className="spinner-border spinner-border-sm" /> : <i className="bx bx-upload" />}
                  <input type="file" className="d-none" accept="image/*" onChange={e => handleUpload(e, 'main')} />
                </label>
              </div>
              {p.image && (
                <img src={formatImage(p.image)} alt="" style={{ marginTop: 10, width: 80, height: 60, borderRadius: 8, objectFit: 'cover', border: '1px solid #e2e8f0' }} />
              )}
            </FormField>
          </div>

          <div style={S.divider} />

          {/* Commission Configuration */}
          <div style={S.sectionTitle}>
            <i className="bx bx-trending-up" style={{ fontSize: 15 }} /> Struktur Komisi & Insentif
          </div>
          <div style={{ background: '#f0f9ff', padding: 24, borderRadius: 16, border: '1.5px solid #bae6fd', marginBottom: 28 }}>
             <p style={{ fontSize: 12, color: '#0369a1', fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="bx bx-info-circle" /> Atur komisi khusus untuk produk ini. Jika diisi, angka ini akan mengabaikan aturan komisi tier/global.
             </p>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 18 }}>
                <FormField label="Komisi Afiliasi (%)">
                  <input style={S.input} type="number" step="0.01" placeholder="Contoh: 10" 
                    value={p.base_affiliate_fee} onChange={e => setP(prev => ({ ...prev, base_affiliate_fee: parseFloat(e.target.value) || 0 }))} />
                </FormField>
                <FormField label="Komisi Afiliasi (Nominal Rp)">
                  <input style={S.input} type="number" placeholder="Contoh: Label 25000" 
                    value={p.base_affiliate_fee_nominal} onChange={e => setP(prev => ({ ...prev, base_affiliate_fee_nominal: parseFloat(e.target.value) || 0 }))} />
                </FormField>
                <FormField label="Fee Distribusi Merchant (%)">
                  <input style={S.input} type="number" step="0.01" placeholder="Contoh: 5" 
                    value={p.base_distribution_fee} onChange={e => setP(prev => ({ ...prev, base_distribution_fee: parseFloat(e.target.value) || 0 }))} />
                </FormField>
                <FormField label="Fee Distribusi Merchant (Rp)">
                  <input style={S.input} type="number" placeholder="Contoh: 15000" 
                    value={p.base_distribution_fee_nominal} onChange={e => setP(prev => ({ ...prev, base_distribution_fee_nominal: parseFloat(e.target.value) || 0 }))} />
                </FormField>
             </div>
          </div>

          <div style={S.divider} />

          {/* Publish Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 12, background: p.status === 'active' ? '#f0fdf4' : '#f8fafc', border: `1.5px solid ${p.status === 'active' ? '#bbf7d0' : '#e2e8f0'}`, transition: 'all 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <i className={`bx ${p.status === 'active' ? 'bx-globe' : 'bx-hide'}`} style={{ fontSize: 22, color: p.status === 'active' ? '#16a34a' : '#94a3b8' }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: p.status === 'active' ? '#166534' : '#475569' }}>
                  {p.status === 'active' ? 'Aktif & Tampil di Storefront' : 'Disimpan sebagai Draft'}
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                  {p.status === 'active' ? 'Produk akan langsung terlihat oleh pembeli' : 'Produk tidak akan ditampilkan ke publik'}
                </div>
              </div>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: 52, height: 28, flexShrink: 0 }}>
              <input type="checkbox" style={{ opacity: 0, width: 0, height: 0 }}
                checked={p.status === 'active'} onChange={e => setP({ ...p, status: e.target.checked ? 'active' : 'taken_down' })} />
              <span style={{
                position: 'absolute', cursor: 'pointer', inset: 0, borderRadius: 28, transition: '0.3s',
                background: p.status === 'active' ? '#22c55e' : '#e2e8f0',
              }}>
                <span style={{
                  position: 'absolute', left: p.status === 'active' ? 26 : 3, top: 3,
                  width: 22, height: 22, borderRadius: '50%', background: '#fff', transition: '0.3s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </span>
            </label>
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 28 }}>
            <button type="submit" style={S.btnPrimary} disabled={saving}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              {saving ? <div className="spinner-border spinner-border-sm" style={{ width: 18, height: 18 }} /> : <i className="bx bx-save" style={{ fontSize: 18 }} />}
              {saving ? 'Menyimpan...' : 'Simpan & Publikasikan'}
            </button>
            <Link to="/admin/products" style={S.btnSecondary}
              onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; }} onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}>
              Batal
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
