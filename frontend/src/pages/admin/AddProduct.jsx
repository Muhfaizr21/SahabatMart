import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson, formatImage } from '../../lib/api';
import { A, PageHeader, FieldLabel } from '../../lib/adminStyles.jsx';
import toast from 'react-hot-toast';
import MediaLibraryModal from '../../components/admin/MediaLibraryModal';

const API = ADMIN_API_BASE;

export default function AdminAddProduct() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [attrs, setAttrs] = useState([]);
  const [presets, setPresets] = useState([]);
  const [tierPresets, setTierPresets] = useState([]);
  const [merchantPresets, setMerchantPresets] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Media Library Modal states
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [mediaModalType, setMediaModalType] = useState('main'); // 'main' or 'gallery'

  const [p, setP] = useState({
    name: '', sku: '', description: '', price: 0, old_price: 0, cogs: 0, weight: 0,
    category: '', brand: '', attributes: '{}', image: '', images: '[]', stock: 100, status: 'active',
    base_affiliate_fee: 0, base_affiliate_fee_nominal: 0,
    base_distribution_fee: 0, base_distribution_fee_nominal: 0,
    commission_preset_id: null,
    tier_commission_preset_id: null,
    merchant_commission_preset_id: null
  });
  const [gallery, setGallery] = useState([]);
  const [selectedAttrs, setSelectedAttrs] = useState({});

  useEffect(() => {
    Promise.all([
      fetchJson(`${API}/categories`),
      fetchJson(`${API}/brands`),
      fetchJson(`${API}/attributes`),
      fetchJson(`${API}/commission-presets`),
      fetchJson(`${API}/tier-commission-presets`),
      fetchJson(`${API}/merchant-commission-presets`)
    ]).then(([c, b, a, prs, tprs, mprs]) => {
      const cats = Array.isArray(c) ? c : (c?.data || []);
      const brds = Array.isArray(b) ? b : (b?.data || []);
      const atts = Array.isArray(a) ? a : (a?.data || []);
      const pData = Array.isArray(prs) ? prs : (prs?.data || []);
      const tpData = Array.isArray(tprs) ? tprs : (tprs?.data || []);
      const mData = Array.isArray(mprs) ? mprs : (mprs?.data || []);

      setCategories(cats);
      setBrands(brds);
      setAttrs(atts);
      setPresets(pData);
      setTierPresets(tpData);
      setMerchantPresets(mData);

      if (cats.length > 0) setP(prev => ({ ...prev, category: cats[0].name }));
      if (brds.length > 0) setP(prev => ({ ...prev, brand: brds[0].name }));
    });
  }, []);

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
      setP(pPrev => ({ ...pPrev, attributes: JSON.stringify(next) }));
      return next;
    });
  };

  const handleUpload = async (e, type = 'main') => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran gambar maksimal 5MB');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const resp = await fetch(`${API}/upload`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'ngrok-skip-browser-warning': 'true'
        },
        body: formData
      });
      
      if (!resp.ok) {
        throw new Error(`HTTP Error ${resp.status}`);
      }
      
      const responseData = await resp.json();
      // FIX: Handle nested JSONResponse wrapper from Go backend
      const uploadedUrl = responseData?.data?.url || responseData?.url;

      if (uploadedUrl) {
        if (type === 'main') {
           setP(prev => ({ ...prev, image: uploadedUrl }));
        } else {
           setGallery(prev => {
             const next = [...prev, uploadedUrl];
             setP(pPrev => ({ ...pPrev, images: JSON.stringify(next) }));
             return next;
           });
        }
        toast.success('Gambar berhasil diunggah');
      } else {
        throw new Error(responseData.message || 'Gagal mengunggah gambar');
      }
    } catch (_err) { 
      toast.error('Upload gagal: ' + _err.message); 
    } finally { 
      setUploading(false); 
    }
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
    if (!p.name) return toast.error('Nama produk wajib diisi!');
    if (!p.price || p.price <= 0) return toast.error('Harga jual tidak boleh nol!');

    setSaving(true);
    fetchJson(`${API}/products/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p)
    })
    .then(() => {
      toast.success('Produk berhasil ditambahkan!');
      navigate('/admin/products');
    })
    .catch(err => {
      toast.error('Gagal: ' + _err.message);
    })
    .finally(() => setSaving(false));
  };

  return (
    <div style={{ ...A.page, maxWidth: 900, margin: '0 auto', paddingBottom: 40 }} className="fade-in">
      <style>{`
        .form-card {
          background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; 
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); overflow: hidden;
        }
        .form-body { padding: 32px; }
        .section-title {
          font-size: 13px; font-weight: 800; color: #64748b; letter-spacing: 0.5px; 
          text-transform: uppercase; display: flex; align-items: center; gap: 8px; margin-bottom: 20px;
        }
        .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
        .form-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .form-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
        .divider { height: 1px; background: #f1f5f9; margin: 32px 0; }
        
        .attr-pill {
           display: flex; align-items: center; gap: 8px; cursor: pointer; 
           font-size: 13px; font-weight: 600; color: #64748b;
           background: #fff; padding: 8px 16px; border-radius: 12px; transition: all 0.2s;
           border: 1.5px solid #e2e8f0;
        }
        .attr-pill.active {
           color: #4361ee; background: rgba(67, 97, 238, 0.05);
           border-color: #4361ee; box-shadow: 0 2px 4px rgba(67, 97, 238, 0.1);
        }

        .toggle-switch {
          position: relative; display: inline-block; width: 50px; height: 26px; flex-shrink: 0;
        }
        .toggle-slider {
          position: absolute; cursor: pointer; inset: 0; border-radius: 26px; transition: 0.3s; background: #e2e8f0;
        }
        .toggle-slider::before {
          content: ""; position: absolute; left: 3px; top: 3px; width: 20px; height: 20px; 
          border-radius: 50%; background: #fff; transition: 0.3s; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .toggle-switch input:checked + .toggle-slider { background: #10b981; }
        .toggle-switch input:checked + .toggle-slider::before { left: 27px; }

        @media (max-width: 768px) {
          .form-body { padding: 20px; }
          .form-grid, .form-grid-3, .form-grid-4 { grid-template-columns: 1fr; gap: 16px; }
          .form-card { border-radius: 12px; }
        }
      `}</style>

      {/* Breadcrumb & Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <Link to="/admin/products" style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color='#4361ee'} onMouseLeave={e => e.target.style.color='#0f172a'}>
          <i className="bx bx-left-arrow-alt" style={{ marginRight: 8, verticalAlign: 'middle' }}/> 
          Katalog
        </Link>
        <i className="bx bx-chevron-right" style={{ color: '#cbd5e1', fontSize: 24 }} />
        <span style={{ fontSize: 16, color: '#64748b', fontWeight: 600 }}>Tambah Produk</span>
      </div>

      <div className="form-card">
        <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #4361ee, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#fff', boxShadow: '0 4px 10px rgba(67, 97, 238, 0.2)' }}>
            <i className="bx bx-package" />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Konfigurasi Produk Baru</div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Publikasi langsung ke toko & set konfigurasi affiliate</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="form-body">
          {/* Basic Info */}
          <div className="section-title"><i className="bx bx-info-circle" /> Informasi Dasar</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <FieldLabel>Nama Produk Lengkap</FieldLabel>
              <input style={A.input} type="text" placeholder="Contoh: Apple MacBook M3 Pro 14-inch" required
                value={p.name} onChange={e => setP(prev => ({ ...prev, name: e.target.value }))} />
            </div>
            <div>
              <FieldLabel>Deskripsi Produk</FieldLabel>
              <textarea style={{ ...A.textarea, minHeight: 100 }} rows={4} placeholder="Jelaskan fitur, spesifikasi, dan keunggulan produk..."
                value={p.description} onChange={e => setP(prev => ({ ...prev, description: e.target.value }))} />
            </div>
          </div>

          <div className="divider" />

          {/* Classification */}
          <div className="section-title"><i className="bx bx-category" /> Klasifikasi & Inventori</div>
          <div className="form-grid-4">
            <div>
              <FieldLabel>Kategori</FieldLabel>
              <select style={A.select} value={p.category} onChange={e => setP(prev => ({ ...prev, category: e.target.value }))}>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>Merek / Brand</FieldLabel>
              <select style={A.select} value={p.brand} onChange={e => setP(prev => ({ ...prev, brand: e.target.value }))}>
                <option value="">— Tanpa Brand —</option>
                {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>SKU / Kode Barcode</FieldLabel>
              <input style={A.input} type="text" placeholder="Kode Unik SKU..."
                value={p.sku} onChange={e => setP(prev => ({ ...prev, sku: e.target.value }))} />
            </div>
            <div>
              <FieldLabel>Berat (Gram)</FieldLabel>
              <input style={A.input} type="number" min={0} value={p.weight} placeholder="0"
                onChange={e => setP(prev => ({ ...prev, weight: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>

          {/* Dynamic Attributes */}
          {attrs.length > 0 && (
            <>
              <div className="divider" />
              <div className="section-title" style={{ justifyContent: 'space-between' }}>
                <span><i className="bx bx-list-check" /> Atribut Produk (Dinamis)</span>
                <Link to="/admin/attributes" style={{ padding: '6px 14px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 11, color: '#4361ee', fontWeight: 700, textDecoration: 'none' }}>
                  <i className="bx bx-cog" /> Master Atribut
                </Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {attrs.map(a => (
                  <div key={a.id} style={{ background: '#f8fafc', padding: '16px', borderRadius: 14, border: '1px solid #e2e8f0' }}>
                    <FieldLabel style={{ marginBottom: 12, color: '#334155' }}>{a.name}</FieldLabel>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                      {a.values?.split(',').map((v, idx) => {
                        const val = v.trim();
                        const isChecked = Array.isArray(selectedAttrs[a.name]) && selectedAttrs[a.name].includes(val);
                        return (
                          <label key={`${a.id}-${val}-${idx}`} className={`attr-pill ${isChecked ? 'active' : ''}`}>
                            <input type="checkbox" checked={isChecked} onChange={e => handleAttrChange(a.name, val, e.target.checked)} style={{ display: 'none' }} />
                            {isChecked && <i className="bx bx-check-circle" style={{ fontSize: 16 }} />}
                            {val}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="divider" />

          {/* Media & Price */}
          <div className="section-title"><i className="bx bx-dollar-circle" /> Harga & Media</div>
          <div className="form-grid-3">
            <div>
              <FieldLabel>Harga Jual (IDR)</FieldLabel>
              <input style={{ ...A.input, fontWeight: 800, color: '#4361ee', fontSize: 16 }} type="number" min={0} value={p.price}
                onChange={e => setP(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <FieldLabel>Harga Coret (Diskon/Opsional)</FieldLabel>
              <input style={A.input} type="number" placeholder="0" min={0}
                value={p.old_price} onChange={e => setP(prev => ({ ...prev, old_price: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <FieldLabel>Modal / COGS (IDR)</FieldLabel>
              <input style={{ ...A.input, color: '#ef4444', fontWeight: 700 }} type="number" min={0} value={p.cogs}
                onChange={e => setP(prev => ({ ...prev, cogs: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>
          
          <div style={{ marginTop: 20 }}>
            <FieldLabel>Foto Utama Produk</FieldLabel>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              {p.image && (
                <div style={{ padding: 4, border: '2px solid #e2e8f0', borderRadius: 12, background: '#fff' }}>
                  <img src={formatImage(p.image)} alt="" style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover' }} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ ...A.input, flex: 1 }} type="text" placeholder="https:// atau Pilih Media..." value={p.image}
                    onChange={e => setP(prev => ({ ...prev, image: e.target.value }))} />
                  <button 
                    type="button"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 10, background: '#f8fafc', border: '1.5px solid #e2e8f0', cursor: 'pointer', flexShrink: 0, color: '#6366f1', transition: 'all 0.2s' }} 
                    onMouseEnter={e => e.currentTarget.style.background='#eef2ff'} 
                    onMouseLeave={e => e.currentTarget.style.background='#f8fafc'}
                    onClick={() => { setMediaModalType('main'); setMediaModalOpen(true); }}
                    title="Pilih dari Media Library"
                  >
                    <i className="bx bx-images" style={{ fontSize: 20 }} />
                  </button>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 10, background: '#f8fafc', border: '1.5px solid #e2e8f0', cursor: 'pointer', flexShrink: 0, color: '#4361ee', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='#eef2ff'} onMouseLeave={e => e.currentTarget.style.background='#f8fafc'} title="Unggah Foto Baru">
                    {uploading ? <i className="bx bx-loader-alt bx-spin" style={{ fontSize: 20 }} /> : <i className="bx bx-upload" style={{ fontSize: 20 }} />}
                    <input type="file" style={{ display: 'none' }} accept="image/*" onChange={e => handleUpload(e, 'main')} />
                  </label>
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>Format: JPG, PNG, WEBP. Maks: 5MB.</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <FieldLabel>Galeri Produk / Slider (Opsional)</FieldLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {gallery.map((img, idx) => (
                <div key={idx} style={{ position: 'relative', width: 80, height: 80, borderRadius: 10, overflow: 'hidden', border: '1.5px solid #e2e8f0' }}>
                  <img src={formatImage(img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button type="button" onClick={() => removeGalleryImage(idx)} style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(239,68,68,0.9)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <i className="bx bx-x" style={{ fontSize: 16 }} />
                  </button>
                </div>
              ))}
              <button 
                type="button"
                style={{ width: 80, height: 80, borderRadius: 10, border: '2px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6366f1', background: '#f8fafc', transition: 'all 0.2s' }} 
                onMouseEnter={e => {e.currentTarget.style.borderColor='#6366f1'; e.currentTarget.style.background='#eef2ff';}} 
                onMouseLeave={e => {e.currentTarget.style.borderColor='#cbd5e1'; e.currentTarget.style.background='#f8fafc';}}
                onClick={() => { setMediaModalType('gallery'); setMediaModalOpen(true); }}
              >
                <i className="bx bx-images" style={{ fontSize: 26 }} />
                <span style={{ fontSize: 10, fontWeight: 600, marginTop: 4 }}>Media Lib</span>
              </button>
              <label style={{ width: 80, height: 80, borderRadius: 10, border: '2px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', background: '#f8fafc', transition: 'all 0.2s' }} onMouseEnter={e => {e.currentTarget.style.borderColor='#4361ee'; e.currentTarget.style.color='#4361ee';}} onMouseLeave={e => {e.currentTarget.style.borderColor='#cbd5e1'; e.currentTarget.style.color='#64748b';}}>
                {uploading ? <i className="bx bx-loader-alt bx-spin" style={{ fontSize: 24 }} /> : <i className="bx bx-image-add" style={{ fontSize: 26 }} />}
                <span style={{ fontSize: 10, fontWeight: 600, marginTop: 4 }}>Unggah</span>
                <input type="file" style={{ display: 'none' }} accept="image/*" onChange={e => handleUpload(e, 'gallery')} />
              </label>
            </div>
          </div>

          <div className="divider" />

          {/* Commission Configuration */}
          <div className="section-title"><i className="bx bx-trending-up" /> Struktur Komisi & Afiliasi</div>
          <div style={{ background: '#f0f9ff', padding: 24, borderRadius: 16, border: '1.5px solid #bae6fd' }}>
             <div style={{ display: 'flex', gap: 10, marginBottom: 20, padding: '12px 16px', background: '#e0f2fe', borderRadius: 10, color: '#0369a1', fontWeight: 600, fontSize: 13, alignItems: 'center' }}>
                <i className="bx bx-info-circle" style={{ fontSize: 18 }} /> 
                Isi form ini untuk menetapkan preset komisi berjenjang (MLM) produk ini.
             </div>
             
             <div>
                <FieldLabel>Preset Komisi Upline (MLM)</FieldLabel>
                <select
                  value={p.commission_preset_id || ''}
                  onChange={e => setP(prev => ({ ...prev, commission_preset_id: e.target.value || null }))}
                  style={{ ...A.select, borderColor: '#7c3aed', background: '#fff', maxWidth: '500px' }}
                >
                  <option value="">-- Gunakan Hierarki Default --</option>
                  {presets.filter(pr => pr.is_active).map(pr => (
                    <option key={pr.id} value={pr.id}>{pr.name}</option>
                  ))}
                </select>
                <div style={{ fontSize: 11, color: '#475569', marginTop: 6 }}>Distribusi komisi berjenjang ke upline mitra.</div>
             </div>
          </div>

          <div className="divider" />

          {/* Publish Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderRadius: 14, background: p.status === 'active' ? '#f0fdf4' : '#f8fafc', border: `1.5px solid ${p.status === 'active' ? '#bbf7d0' : '#e2e8f0'}`, transition: 'all 0.3s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: p.status === 'active' ? '#dcfce7' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={`bx ${p.status === 'active' ? 'bx-check-shield' : 'bx-hide'}`} style={{ fontSize: 24, color: p.status === 'active' ? '#16a34a' : '#64748b' }} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: p.status === 'active' ? '#166534' : '#475569' }}>
                  {p.status === 'active' ? 'Publikasikan ke Toko' : 'Simpan ke Draft'}
                </div>
                <div style={{ fontSize: 12, color: p.status === 'active' ? '#15803d' : '#94a3b8', marginTop: 2 }}>
                  {p.status === 'active' ? 'Pelanggan bisa langsung membeli produk ini' : 'Produk ini akan disembunyikan dari aplikasi'}
                </div>
              </div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" style={{ display: 'none' }}
                checked={p.status === 'active'} onChange={e => setP({ ...p, status: e.target.checked ? 'active' : 'taken_down' })} />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 32, paddingTop: 20, borderTop: '1px solid #f1f5f9' }}>
            <button type="submit" style={{ ...A.btnPrimary, fontSize: 15, padding: '12px 28px' }} disabled={saving}>
              {saving ? <i className="bx bx-loader-alt bx-spin" style={{ fontSize: 20 }} /> : <i className="bx bx-save" style={{ fontSize: 20 }} />}
              {saving ? 'Menyimpan...' : 'Simpan & Publikasikan'}
            </button>
            <Link to="/admin/products" style={{ ...A.btnGhost, padding: '12px 24px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
              Batalkan
            </Link>
          </div>
        </form>
      </div>

      <MediaLibraryModal 
        isOpen={mediaModalOpen}
        onClose={() => setMediaModalOpen(false)}
        multiple={mediaModalType === 'gallery'}
        currentSelection={mediaModalType === 'gallery' ? gallery : p.image}
        onSelect={(selected) => {
          if (mediaModalType === 'main') {
            setP(prev => ({ ...prev, image: selected }));
          } else {
            setGallery(selected);
            setP(prev => ({ ...prev, images: JSON.stringify(selected) }));
          }
        }}
      />
    </div>
  );
}
