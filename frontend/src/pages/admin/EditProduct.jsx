import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson, formatImage } from '../../lib/api';
import toast from 'react-hot-toast';
import { A } from '../../lib/adminStyles';
import MediaLibraryModal from '../../components/admin/MediaLibraryModal';

const API = ADMIN_API_BASE;

export default function AdminEditProduct() {
  const navigate = useNavigate();
  const location = useLocation();
  const productId = new URLSearchParams(location.search).get('id');

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [attrs, setAttrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [p, setP] = useState({
    id: '', name: '', sku: '', description: '', price: 0, old_price: 0, cogs: 0, weight: 0,
    category: '', brand: '', attributes: '{}', image: '',
    images: '[]', stock: 0, status: 'active',
    base_affiliate_fee: 0, base_affiliate_fee_nominal: 0,
    base_distribution_fee: 0, base_distribution_fee_nominal: 0,
    merchant_commission_percent: 0,
    commission_preset_id: '',
    tier_commission_preset_id: '',
    merchant_commission_preset_id: ''
  });

  const [tiers, setTiers] = useState([]);
  const [tierComms, setTierComms] = useState([]);
  const [updatingTier, setUpdatingTier] = useState(null);
  const [presets, setPresets] = useState([]);
  const [tierPresets, setTierPresets] = useState([]);
  const [merchantPresets, setMerchantPresets] = useState([]);

  const [gallery, setGallery] = useState([]);
  const [selectedAttrs, setSelectedAttrs] = useState({});
  const [variants, setVariants] = useState([]);
  const [newVariant, setNewVariant] = useState({ 
    name: '', sku: '', price: 0, wholesale_price: 0, cogs: 0, stock: 0, weight: 0,
    commission_preset_id: '',
    tier_commission_preset_id: '',
    merchant_commission_preset_id: ''
  });
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);

  // Media Library states
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [mediaModalType, setMediaModalType] = useState('main'); // 'main' or 'gallery'

  useEffect(() => {
    console.log("DEBUG: Fetching Product ID:", productId);
    if (!productId) return;
    setLoading(true);
    Promise.all([
      fetchJson(`${API}/categories`),
      fetchJson(`${API}/brands`),
      fetchJson(`${API}/attributes`),
      fetchJson(`${API}/membership-tiers`),
      fetchJson(`${API}/products/tier-commissions?product_id=${productId}`),
      fetchJson(`${API}/products/detail?id=${productId}`),
      fetchJson(`${API}/commission-presets`),
      fetchJson(`${API}/tier-commission-presets`),
      fetchJson(`${API}/merchant-commission-presets`),
      fetchJson(`${API}/products/variants?product_id=${productId}`),
    ]).then(([cats, brds, atts, tiersData, tComms, prod, prs, tprs, mprs, vars]) => {
      setPresets(Array.isArray(prs) ? prs : (prs?.data || []));
      setTierPresets(Array.isArray(tprs) ? tprs : (tprs?.data || []));
      setMerchantPresets(Array.isArray(mprs) ? mprs : (mprs?.data || []));
      setVariants(Array.isArray(vars) ? vars : (vars?.data || []));
      setCategories(Array.isArray(cats) ? cats : (cats?.data || []));
      setBrands(Array.isArray(brds) ? brds : (brds?.data || []));
      setAttrs(Array.isArray(atts) ? atts : (atts?.data || []));
      setTiers(Array.isArray(tiersData) ? tiersData : (tiersData?.data || []));
      setTierComms(Array.isArray(tComms) ? tComms : (tComms?.data || []));
      
      const item = prod?.data || prod;
      if (item && item.id) {
        setP({
          id: item.id, name: item.name || '', sku: item.sku || '', description: item.description || '',
          price: item.price || 0, old_price: item.old_price || 0,
          cogs: item.cogs || 0,
          category: item.category || '', brand: item.brand || '',
          image: item.image || '', images: item.images || '[]', stock: item.stock || 0,
          weight: item.weight || 0,
          status: item.status || 'active',
          base_affiliate_fee: item.base_affiliate_fee || 0,
          base_affiliate_fee_nominal: item.base_affiliate_fee_nominal || 0,
          base_distribution_fee: item.base_distribution_fee || 0,
          base_distribution_fee_nominal: item.base_distribution_fee_nominal || 0,
          merchant_commission_percent: item.merchant_commission_percent || 0,
          commission_preset_id: item.commission_preset_id || null,
          tier_commission_preset_id: item.tier_commission_preset_id || null,
          merchant_commission_preset_id: item.merchant_commission_preset_id || null,
          attributes: item.attributes || '{}'
        });
        try {
          setSelectedAttrs(JSON.parse(item.attributes || '{}'));
          setGallery(JSON.parse(item.images || '[]'));
        } catch(e) { 
          setSelectedAttrs({}); 
          setGallery([]);
        }
      } else {
        setError("Produk tidak ditemukan atau data tidak lengkap");
      }
    })
    .catch(err => {
      console.error("Fetch error:", _err);
      setError(_err.message || "Gagal mengambil data produk");
    })
    .finally(() => setLoading(false));
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

  const handleUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    // Simpan status foto sebelumnya buat jaga-jaga kalau gagal
    const previousMainImage = p.image;

    setUploading(true);
    const localUrl = URL.createObjectURL(file);
    if (type === 'main') {
      setP(prev => ({ ...prev, image: localUrl }));
    } else {
      setGallery(prev => [...prev, localUrl]);
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
      // Endpoint yang benar adalah /api/admin/upload, bukan /products/upload
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
      
      // Backend mungkin mereturn URL langsung di root object atau di dalam object "data"
      const extractedUrl = responseData.url || (responseData.data && responseData.data.url) || responseData.imageUrl;
      
      if (extractedUrl) {
        // Normalize path: remove API_BASE if it exists in the returned URL
        let cleanUrl = extractedUrl;
        const baseWithoutSlash = API.replace('/api/admin', '');
        if (cleanUrl.startsWith(baseWithoutSlash)) {
          cleanUrl = cleanUrl.replace(baseWithoutSlash, '');
        }
        
        // Ensure it's a relative path starting with /uploads/
        if (!cleanUrl.startsWith('/') && !cleanUrl.startsWith('http')) {
          cleanUrl = '/' + cleanUrl;
        }

        const serverUrl = `${cleanUrl}?t=${Date.now()}`;
        if (type === 'main') {
          setP(prev => ({ ...prev, image: serverUrl }));
        } else {
          setGallery(prev => prev.map(url => url === localUrl ? serverUrl : url));
          // Note: gallery state update is async, use local copy for p update
          const newGallery = gallery.map(url => url === localUrl ? serverUrl : url);
          setP(pPrev => ({ ...pPrev, images: JSON.stringify(newGallery) }));
        }
        toast.success("Foto berhasil tersimpan di server!");
      } else {
        throw new Error(responseData.error || responseData.message || "Respon dari server kosong atau tidak valid.");
      }
    } catch (_err) { 
      toast.error("Gagal mengunggah ke server: " + _err.message);
      // Rollback ke foto awal kalau gagal (biar Blob URL gak kesimpen)
      if (type === 'main') {
        setP(prev => ({ ...prev, image: previousMainImage }));
      } else {
        setGallery(prev => prev.filter(url => url !== localUrl));
      }
    } finally { 
      setUploading(false);
      // Tunggu sedikit sebelum mematikan blob agar transisi React mulus
      setTimeout(() => URL.revokeObjectURL(localUrl), 100); 
    }
  };

  const removeGalleryImage = (idx) => {
     setGallery(prev => {
       const next = prev.filter((_, i) => i !== idx);
       setP(pPrev => ({ ...pPrev, images: JSON.stringify(next) }));
       return next;
     });
  };

  const handleTierCommUpdate = (tierId, rate) => {
    setUpdatingTier(tierId);
    fetchJson(`${API}/products/tier-commissions/update`, {
        method: 'POST',
        body: JSON.stringify({
            product_id: productId,
            membership_tier_id: parseInt(tierId),
            commission_rate: parseFloat(rate)
        })
    }).then(resp => {
        const updated = resp.data || resp;
        setTierComms(prev => {
            const idx = prev.findIndex(x => x.membership_tier_id === updated.membership_tier_id);
            if (idx > -1) {
                const next = [...prev];
                next[idx] = updated;
                return next;
            }
            return [...prev, updated];
        });
        toast.success('Komisi tier diperbarui');
    }).catch(e => toast.error(e.message))
    .finally(() => setUpdatingTier(null));
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    
    // Ensure numeric fields are correct
    const payload = {
      ...p,
      price: parseFloat(p.price) || 0,
      old_price: parseFloat(p.old_price) || 0,
      cogs: parseFloat(p.cogs) || 0,
      weight: parseInt(p.weight) || 0,
      stock: parseInt(p.stock) || 0,
      merchant_commission_percent: parseFloat(p.merchant_commission_percent) || 0,
      merchant_commission_preset_id: p.merchant_commission_preset_id || null,
      commission_preset_id: p.commission_preset_id || null,
      tier_commission_preset_id: p.tier_commission_preset_id || null,
    };

    fetchJson(`${API}/products/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(() => {
      toast.success('Produk berhasil diperbarui!');
      navigate('/admin/products');
    })
    .catch(err => {
      toast.error("Gagal update: " + _err.message);
    })
    .finally(() => setSaving(false));
  };

  const handleAddVariant = () => {
    const payload = { ...newVariant, product_id: productId };
    fetchJson(`${API}/products/variants/add`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }).then(resp => {
      setVariants(prev => [...prev, resp.data || resp]);
      setNewVariant({ 
        name: '', sku: '', price: 0, wholesale_price: 0, cogs: 0, stock: 0, weight: 0,
        commission_preset_id: '',
        tier_commission_preset_id: '',
        merchant_commission_preset_id: ''
      });
      setShowVariantModal(false);
      toast.success('Varian berhasil ditambahkan');
    }).catch(e => toast.error(e.message));
  };

  const handleUpdateVariant = () => {
    fetchJson(`${API}/products/variants/update`, {
      method: 'PUT',
      body: JSON.stringify(editingVariant)
    }).then(() => {
      setVariants(prev => prev.map(v => v.id === editingVariant.id ? editingVariant : v));
      setEditingVariant(null);
      toast.success('Varian diperbarui');
    }).catch(e => toast.error(e.message));
  };

  const handleDeleteVariant = (id) => {
    if (!window.confirm('Hapus varian ini?')) return;
    fetchJson(`${API}/products/variants/delete?id=${id}`, { method: 'DELETE' })
      .then(() => {
        setVariants(prev => prev.filter(v => v.id !== id));
        toast.success('Varian dihapus');
      }).catch(e => toast.error(e.message));
  };

  if (loading) return (
    <div style={{ padding: 100, textAlign: 'center' }}>
      <div className="spinner" style={{ width: 40, height: 40, border: '4px solid #f3f3f3', borderTop: '4px solid #4361ee', borderRadius: '50%', margin: '0 auto' }} />
    </div>
  );

  if (!p.id || error) return (
    <div style={{ padding: 100, textAlign: 'center' }}>
      <i className="bx bx-error-circle" style={{ fontSize: 64, color: '#ef4444', marginBottom: 16 }} />
      <h2 style={{ fontWeight: 800, color: '#0f172a' }}>Gagal Memuat Produk</h2>
      <p style={{ color: '#64748b', marginBottom: 24 }}>{error || "ID produk tidak valid atau sudah dihapus."}</p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <Link to="/admin/products" style={{ ...A.btnSecondary, textDecoration: 'none', display: 'inline-flex' }}>Kembali ke Katalog</Link>
        <button onClick={() => window.location.reload()} style={{ ...A.btnPrimary, cursor: 'pointer' }}>Coba Lagi</button>
      </div>
    </div>
  );

  return (
    <div className="admin-edit-container">
      {/* Header Section */}
      <div className="header-flex">
        <div className="header-info">
          <div className="breadcrumb">
            <Link to="/admin">Dashboard</Link>
            <i className="bx bx-chevron-right" />
            <Link to="/admin/products">Produk</Link>
            <i className="bx bx-chevron-right" />
            <span className="current">Ubah SKU</span>
          </div>
          <h2 className="page-title">
            Ubah: {p.name || 'Memuat SKU...'}
          </h2>
        </div>
        <div className="header-actions">
          <button onClick={() => navigate('/admin/products')} className="btn-cancel">Batal</button>
          <button 
            onClick={handleSubmit} 
            disabled={saving || uploading} 
            className="btn-save"
          >
            {uploading ? 'Mengunggah Foto...' : saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>

      <div className="responsive-flex-layout">
        
        {/* Left Column: Basic Info */}
        <div className="main-content-area">
          
          {/* Card 1: Core Info */}
          <div style={{ ...A.card, padding: '25px' }}>
            <h5 className="card-title">
              <i className="bx bx-info-circle" /> Informasi Dasar
            </h5>
            
            <div className="form-group-stack">
              <div>
                <label className="input-label">Nama Produk</label>
                <input 
                  type="text" 
                  className="form-input"
                  value={p.name} 
                  onChange={e => setP({...p, name: e.target.value})}
                  placeholder="Contoh: MacBook Pro M3"
                />
              </div>

              <div className="input-row">
                <div style={{ flex: 1 }}>
                  <label className="input-label">SKU / Barcode</label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={p.sku} 
                    onChange={e => setP({...p, sku: e.target.value})}
                    placeholder="E.g. BC-12345678"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="input-label">Berat (Gram)</label>
                  <div className="input-with-suffix">
                    <input 
                      type="number" 
                      className="form-input"
                      value={p.weight} 
                      onChange={e => setP({...p, weight: parseInt(e.target.value) || 0})}
                      placeholder="500"
                    />
                    <span className="suffix">GR</span>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="input-label">Deskripsi (Format Panjang)</label>
                <textarea 
                  className="form-input"
                  value={p.description} 
                  onChange={e => setP({...p, description: e.target.value})}
                  rows={8}
                  placeholder="Jelaskan detail produk di sini..."
                  style={{ resize: 'vertical', lineHeight: 1.6 }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Attributes */}
          <div style={{ ...A.card, padding: '25px', marginTop: '24px' }}>
            <div className="card-header-between">
              <h5 className="card-title" style={{ margin: 0 }}>
                <i className="bx bx-list-check" /> Atribut Produk
              </h5>
              <Link to="/admin/attributes" className="manage-link">Kelola Pilihan <i className="bx bx-right-arrow-alt" /></Link>
            </div>
            
            <div className="attributes-container">
              {attrs.map(a => (
                <div key={a.id} className="attribute-group">
                  <div className="attr-label">{a.name}</div>
                  <div className="attr-pills">
                    {a.values?.split(',').map((v, idx) => {
                      const val = v.trim();
                      const isChecked = Array.isArray(selectedAttrs[a.name]) && selectedAttrs[a.name].includes(val);
                      return (
                        <label key={idx} className={`attr-pill ${isChecked ? 'active' : ''}`}>
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

          {/* Card 3: Tier Commission Matrix */}
          <div style={{ ...A.card, padding: '25px', marginTop: '24px' }}>
            <h5 className="card-title">
              <i className="bx bx-sitemap" /> Matriks Komisi per Tier
            </h5>
            <p className="card-subtitle">
              Atur persentase komisi khusus untuk produk ini berdasarkan jenjang affiliate.
            </p>

            <div style={{ marginTop: '20px', marginBottom: '20px' }}>
              <label className="mini-label">Preset Komisi Chain</label>
              <select 
                className="form-select" 
                value={p.commission_preset_id || ''} 
                onChange={e => setP({...p, commission_preset_id: e.target.value || null})}
                style={{ maxWidth: '400px' }}
              >
                <option value="">-- Gunakan Default --</option>
                {presets.map(pr => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
              </select>
            </div>
            
            <div className="table-responsive">
              <table className="tier-table">
                <thead>
                  <tr>
                    <th>Jenjang</th>
                    <th style={{ textAlign: 'center' }}>Default</th>
                    <th style={{ textAlign: 'right' }}>Rate Khusus (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {tiers.sort((a,b) => a.level - b.level).map(tier => {
                    const custom = tierComms.find(x => x.membership_tier_id === tier.id);
                    const currentRate = custom ? (custom.commission_rate * 100).toFixed(1) : '';
                    
                    return (
                      <tr key={tier.id}>
                        <td>
                          <div className="tier-name-cell">
                            <div className="tier-dot" style={{ background: tier.color }} />
                            <span>{tier.name}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                          {(tier.base_commission_rate * 100).toFixed(1)}%
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="rate-input-container">
                            <input 
                                type="number" 
                                step="0.1"
                                placeholder="Auto"
                                defaultValue={currentRate}
                                onBlur={(e) => {
                                    if (e.target.value !== currentRate) {
                                        handleTierCommUpdate(tier.id, e.target.value);
                                    }
                                }}
                                disabled={updatingTier === tier.id}
                                className="rate-input"
                            />
                            {updatingTier === tier.id && <i className="bx bx-loader-alt bx-spin" />}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card 4: Variants Management */}
          <div style={{ ...A.card, padding: '25px', marginTop: '24px' }}>
            <div className="card-header-between" style={{ marginBottom: 20 }}>
              <h5 className="card-title" style={{ margin: 0 }}>
                <i className="bx bx-purchase-tag-alt" /> Varian Produk (SKU Berbeda)
              </h5>
              <button 
                onClick={() => setShowVariantModal(true)}
                className="btn-add-variant"
                style={{ background: '#4361ee', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <i className="bx bx-plus" /> Tambah Varian
              </button>
            </div>
            
            {variants.length > 0 ? (
              <div className="table-responsive">
                <table className="variant-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1.5px solid #f1f5f9' }}>
                      <th style={{ padding: '12px 0', fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Nama Varian</th>
                      <th style={{ padding: '12px 0', fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>SKU</th>
                      <th style={{ padding: '12px 0', fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Harga (Rp)</th>
                      <th style={{ padding: '12px 0', fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>Stok</th>
                      <th style={{ padding: '12px 0', fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map(v => (
                      <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px 0', fontWeight: 800, color: '#0f172a', fontSize: 14 }}>{v.name}</td>
                        <td style={{ padding: '16px 0', color: '#64748b', fontSize: 12 }}>{v.sku}</td>
                        <td style={{ padding: '16px 0', fontWeight: 800, color: '#4361ee', fontSize: 14 }}>{v.price.toLocaleString('id-ID')}</td>
                        <td style={{ padding: '16px 0', textAlign: 'center' }}>
                          <span style={{ background: v.stock > 0 ? '#dcfce7' : '#fee2e2', color: v.stock > 0 ? '#166534' : '#991b1b', padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 800 }}>
                            {v.stock}
                          </span>
                        </td>
                        <td style={{ padding: '16px 0', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button onClick={() => setEditingVariant(v)} className="btn-icon" title="Edit"><i className="bx bx-edit-alt" /></button>
                            <button onClick={() => handleDeleteVariant(v.id)} className="btn-icon danger" title="Hapus"><i className="bx bx-trash" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '40px 0', textAlign: 'center', background: '#f8fafc', borderRadius: 16, border: '2px dashed #e2e8f0' }}>
                <i className="bx bx-package" style={{ fontSize: 40, color: '#cbd5e1', marginBottom: 12 }} />
                <p style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>Belum ada varian. Gunakan varian jika produk memiliki harga/stok berbeda (misal: 10ml vs 30ml).</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Sidebar Actions */}
        <div className="sidebar-content-area">
          
          {/* Media Section */}
          <div style={{ ...A.card, padding: '20px' }}>
             <h5 className="side-card-title">Media Utama</h5>
             <div className="main-image-uploader-wrapper">
                <label className="main-image-label">
                   <img 
                     src={formatImage(p.image)} 
                     className="preview-img"
                     alt="Main"
                     key={p.image} 
                     onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=P&background=f1f5f9&color=64748b'; }}
                   />
                   <div className="upload-overlay">
                      <div className="upload-trigger-v2">
                         {uploading ? <div className="spinner-small" /> : <i className="bx bx-camera" />}
                      </div>
                      <span className="upload-text">Ganti Foto Utama</span>
                   </div>
                   <input type="file" style={{ display: 'none' }} accept="image/*" onChange={e => handleUpload(e, 'main')} />
                </label>
             </div>
             <button
                type="button"
                style={{ ...A.btnGhost, width: '100%', justifyContent: 'center', marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                onClick={() => { setMediaModalType('main'); setMediaModalOpen(true); }}
             >
                <i className="bx bx-images" /> Pilih dari Pustaka Media
             </button>
             
             <h5 className="sub-label-uppercase" style={{ marginTop: 20 }}>Galeri Produk</h5>
             <div className="gallery-grid">
                {gallery.map((img, idx) => (
                  <div key={idx} className="gallery-item">
                    <img src={formatImage(img)} alt="" />
                    <button onClick={() => removeGalleryImage(idx)} className="btn-remove-img"><i className="bx bx-x" /></button>
                  </div>
                ))}
                 <button
                    type="button"
                    className="gallery-add"
                    style={{ borderStyle: 'dashed', borderWidth: '2.5px', background: '#fff', color: '#6366f1', display: 'flex', flexDirection: 'column', gap: 2, padding: 0 }}
                    onClick={() => { setMediaModalType('gallery'); setMediaModalOpen(true); }}
                    title="Ambil dari Media Library"
                 >
                    <i className="bx bx-images" style={{ fontSize: 18 }} />
                    <span style={{ fontSize: 8, fontWeight: 800 }}>Media Lib</span>
                 </button>
                 <label className="gallery-add">
                    <i className="bx bx-plus" />
                    <input type="file" style={{ display: 'none' }} accept="image/*" onChange={e => handleUpload(e, 'gallery')} />
                 </label>
             </div>
          </div>

          {/* Pricing Section */}
          <div style={{ ...A.card, padding: '20px', background: '#f8faff', border: '1px solid #eef2ff' }}>
              <h5 className="side-card-title">Keuangan</h5>
              <div className="form-group-stack-small">
                 <div>
                    <label className="mini-label">Harga Utama (Rp)</label>
                    <input type="number" className="price-input" value={p.price} onChange={e => setP({...p, price: e.target.value})} />
                 </div>
                 <div>
                    <label className="mini-label">Harga Coret (Rp)</label>
                    <input type="number" className="form-input-small" value={p.old_price} onChange={e => setP({...p, old_price: e.target.value})} />
                 </div>
                 <div>
                    <label className="mini-label">Modal Awal / COGS</label>
                    <input type="number" className="form-input-small danger" value={p.cogs} onChange={e => setP({...p, cogs: e.target.value})} />
                 </div>
                 <div>
                    <label className="mini-label">Komisi Merchant (%)</label>
                    <div className="input-with-suffix">
                      <input 
                        type="number" 
                        step="0.1"
                        className="form-input-small" 
                        value={p.merchant_commission_percent} 
                        onChange={e => setP({...p, merchant_commission_percent: e.target.value})} 
                      />
                      <span className="suffix">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="mini-label">Merchant Commission Preset</label>
                    <select 
                      className="form-select" 
                      value={p.merchant_commission_preset_id || ''} 
                      onChange={e => setP({...p, merchant_commission_preset_id: e.target.value || null})}
                    >
                      <option value="">-- Tanpa Preset --</option>
                      {merchantPresets.map(mp => (
                        <option key={mp.id} value={mp.id}>{mp.name} ({(mp.merchant_commission_rate * 100).toFixed(1)}%)</option>
                      ))}
                    </select>
                  </div>
                 <div className="divider-h" />
                 <div>
                    <label className="mini-label">Stok Tersedia</label>
                    <input type="number" className="form-input-small bold" value={p.stock} onChange={e => setP({...p, stock: e.target.value})} />
                 </div>
              </div>
          </div>

          {/* Status Section */}
          <div style={{ ...A.card, padding: '20px' }}>
              <h5 className="side-card-title">Pengaturan & Status</h5>
              <div className="form-group-stack-small">
                <div>
                  <label className="mini-label">Kategori</label>
                  <select className="form-select" value={p.category} onChange={e => setP({...p, category: e.target.value})}>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mini-label">Status Produk</label>
                  <div className="status-toggle">
                    <button type="button" onClick={() => setP({...p, status: 'active'})} className={`toggle-btn success ${p.status === 'active' ? 'active' : ''}`}>Aktif</button>
                    <button type="button" onClick={() => setP({...p, status: 'taken_down'})} className={`toggle-btn danger ${p.status === 'taken_down' ? 'active' : ''}`}>Ditarik</button>
                  </div>
                </div>
              </div>
          </div>
        </div>
      </div>

      <style>{`
        .admin-edit-container {
          padding: 0 16px 40px;
          max-width: 1400px;
          margin: 0 auto;
          animation: fadeIn 0.4s ease;
        }
        
        .header-flex {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 24px;
        }
        
        @media (min-width: 768px) {
          .header-flex {
            flex-direction: row;
            justify-content: space-between;
            align-items: flex-end;
          }
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: #94a3b8;
          margin-bottom: 4px;
        }
        
        .breadcrumb a { color: inherit; text-decoration: none; font-weight: 600; }
        .breadcrumb .current { font-weight: 700; color: #0f172a; }
        
        .page-title {
          font-size: 22px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.03em;
          margin: 0;
        }

        .header-actions {
          display: flex;
          gap: 8px;
        }

        .btn-cancel {
          padding: 10px 16px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: #fff;
          font-size: 13px;
          font-weight: 700;
          color: #64748b;
          cursor: pointer;
          flex: 1;
        }

        .btn-save {
          padding: 10px 20px;
          border-radius: 12px;
          border: none;
          background: #4361ee;
          font-size: 13px;
          font-weight: 700;
          color: #fff;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(67, 97, 238, 0.3);
          flex: 1;
        }

        @media (min-width: 768px) {
          .btn-cancel, .btn-save { flex: none; }
        }

        /* FLEX WRAP LAYOUT - The core of responsiveness */
        .responsive-flex-layout {
          display: flex;
          flex-wrap: wrap;
          gap: 24px;
          align-items: flex-start;
        }

        .main-content-area {
          flex: 1;
          min-width: 320px; /* Minimum width before stacking */
        }

        .sidebar-content-area {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        @media (min-width: 1200px) {
          .sidebar-content-area {
            width: 350px;
          }
        }

        .card-title {
          font-size: 13px;
          font-weight: 900;
          color: #1e293b;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .card-title i { color: #4361ee; font-size: 18px; }
        
        .card-header-between { display: flex; justify-content: space-between; align-items: center; }
        .manage-link { font-size: 11px; font-weight: 800; color: #4361ee; text-decoration: none; }

        .form-group-stack { display: flex; flex-direction: column; gap: 20px; }
        .form-group-stack-small { display: flex; flex-direction: column; gap: 14px; }
        
        .input-label {
          display: block;
          font-size: 10px;
          font-weight: 900;
          color: #94a3b8;
          text-transform: uppercase;
          margin-bottom: 6px;
          letter-spacing: 0.06em;
        }
        
        .form-input {
          width: 100%;
          padding: 12px 16px;
          border-radius: 12px;
          border: 1.5px solid #f1f5f9;
          background: #fcfdfe;
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
          outline: none;
          transition: all 0.2s;
        }
        
        .form-input:focus { border-color: #4361ee; background: #fff; box-shadow: 0 0 0 4px rgba(67, 97, 238, 0.08); }
        
        .input-row { display: flex; flex-direction: column; gap: 16px; }
        @media (min-width: 640px) { .input-row { flex-direction: row; } }
        
        .input-with-suffix { position: relative; }
        .suffix { position: absolute; right: 16px; top: 14px; font-size: 10px; font-weight: 900; color: #cbd5e1; }

        .attr-pills { display: flex; flex-wrap: wrap; gap: 8px; }
        .attr-pill {
          padding: 6px 16px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          background: #fff;
          color: #64748b;
          border: 1.5px solid #f1f5f9;
          transition: all 0.2s;
        }
        .attr-pill.active { background: #4361ee; color: #fff; border-color: #4361ee; box-shadow: 0 4px 10px rgba(67, 97, 238, 0.2); }

        .table-responsive { overflow-x: auto; margin: 0 -24px; padding: 0 24px; }
        .tier-table { width: 100%; border-collapse: collapse; min-width: 400px; }
        .tier-table th { text-align: left; font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase; padding: 12px; border-bottom: 1px solid #f1f5f9; }
        .tier-table td { padding: 14px 12px; border-bottom: 1px solid #f8fafc; }
        
        .tier-name-cell { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 800; color: #1e293b; }
        .tier-dot { width: 8px; height: 8px; border-radius: 50%; }
        
        .rate-input {
          width: 75px;
          padding: 8px 12px;
          border-radius: 8px;
          border: 1.5px solid #f1f5f9;
          text-align: right;
          font-size: 14px;
          font-weight: 800;
          outline: none;
          color: #4361ee;
        }

        .main-image-uploader-wrapper {
          border: 2px dashed #f1f5f9;
          border-radius: 16px;
          padding: 8px;
          background: #f8fafc;
          overflow: hidden;
        }

        .main-image-label {
          position: relative;
          display: block;
          cursor: pointer;
          border-radius: 12px;
          overflow: hidden;
        }

        .preview-img {
          width: 100%;
          height: 200px;
          object-fit: cover;
          display: block;
          transition: transform 0.4s ease;
        }

        .main-image-label:hover .preview-img {
          transform: scale(1.05);
        }

        .upload-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s ease;
          gap: 8px;
        }

        .main-image-label:hover .upload-overlay {
          opacity: 1;
        }

        .upload-trigger-v2 {
          width: 48px;
          height: 48px;
          background: #fff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        }

        .upload-trigger-v2 i {
          font-size: 24px;
          color: #4361ee;
        }

        .upload-text {
          color: #fff;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        .gallery-grid { display: flex; flex-wrap: wrap; gap: 10px; }
        .gallery-item { position: relative; width: 70px; height: 70px; }
        .gallery-item img { width: 100%; height: 100%; object-fit: cover; border-radius: 12px; border: 1.5px solid #f1f5f9; }
        .btn-remove-img {
          position: absolute; top: -6px; right: -6px; width: 22px; height: 22px;
          border-radius: 50%; background: #ef4444; color: #fff; border: 2px solid #fff;
          display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 14px;
        }
        .gallery-add {
          width: 70px; height: 70px; border-radius: 12px; border: 2.5px dashed #e2e8f0;
          display: flex; align-items: center; justify-content: center; cursor: pointer; color: #94a3b8;
          background: #fff; transition: all 0.2s;
        }
        .gallery-add:hover { border-color: #4361ee; color: #4361ee; background: #f5f7ff; }

        .side-card-title { font-size: 13px; font-weight: 900; color: #1e293b; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.05em; }
        .mini-label { display: block; font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px; }
        .sub-label-uppercase { font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }

        .price-input { width: 100%; padding: 12px 14px; border-radius: 10px; border: 1.5px solid #e2e8f0; font-size: 18px; font-weight: 900; color: #4361ee; outline: none; }
        .form-input-small { width: 100%; padding: 10px 14px; border-radius: 10px; border: 1.5px solid #f1f5f9; font-size: 14px; font-weight: 700; outline: none; }
        .form-input-small.danger { color: #ef4444; background: #fff8f8; }
        .form-input-small.bold { font-weight: 900; color: #0f172a; }
        
        .form-select { width: 100%; padding: 12px 14px; border-radius: 10px; border: 1.5px solid #f1f5f9; font-size: 14px; font-weight: 700; cursor: pointer; background: #fff; }
        
        .status-toggle { display: flex; gap: 8px; }
        .toggle-btn { flex: 1; padding: 12px; border-radius: 10px; font-size: 12px; font-weight: 800; border: 1.5px solid #f1f5f9; background: #fff; color: #94a3b8; cursor: pointer; transition: all 0.2s; }
        .toggle-btn.success.active { background: #dcfce7; color: #15803d; border-color: #15803d; }
        .toggle-btn.danger.active { background: #fee2e2; color: #b91c1c; border-color: #b91c1c; }

        .spinner-small { width: 18px; height: 18px; border: 3px solid #eee; border-top: 3px solid #4361ee; border-radius: 50%; animation: spin 0.6s linear infinite; }
        
        /* Modal Styles */
        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center; z-index: 1000;
          animation: fadeIn 0.2s ease-out;
        }
        .modal-content {
          background: #fff; width: 500px; max-width: 95%; border-radius: 24px;
          padding: 32px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .modal-title { font-size: 18px; font-weight: 900; color: #1e293b; margin: 0; }
        .btn-close { background: none; border: none; font-size: 24px; color: #94a3b8; cursor: pointer; }
        
        .variant-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
        
        .btn-icon {
          width: 32px; height: 32px; border-radius: 8px; border: none;
          background: #f1f5f9; color: #64748b; cursor: pointer;
          display: flex; align-items: center; justify-content: center; transition: all 0.2s;
        }
        .btn-icon:hover { background: #e2e8f0; color: #4361ee; }
        .btn-icon.danger:hover { background: #fee2e2; color: #ef4444; }

        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
      `}</style>

      {/* Modal: Add Variant */}
      {showVariantModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Tambah Varian Baru</h3>
              <button className="btn-close" onClick={() => setShowVariantModal(false)}>&times;</button>
            </div>
            <div className="variant-grid">
              <div style={{ gridColumn: 'span 2' }}>
                <label className="mini-label">Nama Varian (Misal: 10ml, Merah, dsb)</label>
                <input type="text" className="form-input-small bold" value={newVariant.name} onChange={e => setNewVariant({...newVariant, name: e.target.value})} placeholder="Nama Varian" />
              </div>
              <div>
                <label className="mini-label">SKU Varian</label>
                <input type="text" className="form-input-small" value={newVariant.sku} onChange={e => setNewVariant({...newVariant, sku: e.target.value})} placeholder="SKU-VAR-1" />
              </div>
              <div>
                <label className="mini-label">Stok</label>
                <input type="number" className="form-input-small" value={newVariant.stock} onChange={e => setNewVariant({...newVariant, stock: parseInt(e.target.value)})} />
              </div>
              <div>
                <label className="mini-label">Harga Jual (Rp)</label>
                <input type="number" className="form-input-small bold" style={{ color: '#4361ee' }} value={newVariant.price} onChange={e => setNewVariant({...newVariant, price: parseInt(e.target.value)})} />
              </div>
              <div>
                <label className="mini-label">Harga Grosir (Rp)</label>
                <input type="number" className="form-input-small" value={newVariant.wholesale_price} onChange={e => setNewVariant({...newVariant, wholesale_price: parseInt(e.target.value)})} />
              </div>
              <div>
                <label className="mini-label">Modal / COGS (Rp)</label>
                <input type="number" className="form-input-small danger" value={newVariant.cogs} onChange={e => setNewVariant({...newVariant, cogs: parseInt(e.target.value)})} />
              </div>
              <div>
                <label className="mini-label">Berat (Gram)</label>
                <input type="number" className="form-input-small" value={newVariant.weight} onChange={e => setNewVariant({...newVariant, weight: parseInt(e.target.value)})} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="mini-label">Preset Komisi Affiliate (Override)</label>
                <select 
                  className="form-input-small" 
                  value={newVariant.commission_preset_id || ''} 
                  onChange={e => setNewVariant({...newVariant, commission_preset_id: e.target.value})}
                >
                  <option value="">Gunakan Default Produk</option>
                  {presets.map(ps => <option key={ps.id} value={ps.id}>{ps.name}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="mini-label">Preset Komisi Merchant (Override)</label>
                <select 
                  className="form-input-small" 
                  value={newVariant.merchant_commission_preset_id || ''} 
                  onChange={e => setNewVariant({...newVariant, merchant_commission_preset_id: e.target.value})}
                >
                  <option value="">Gunakan Default Produk</option>
                  {merchantPresets.map(ps => <option key={ps.id} value={ps.id}>{ps.name}</option>)}
                </select>
              </div>
            </div>
            <button onClick={handleAddVariant} className="btn-save" style={{ width: '100%', padding: '14px' }}>Tambah Varian</button>
          </div>
        </div>
      )}

      {/* Modal: Edit Variant */}
      {editingVariant && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Edit Varian</h3>
              <button className="btn-close" onClick={() => setEditingVariant(null)}>&times;</button>
            </div>
            <div className="variant-grid">
              <div style={{ gridColumn: 'span 2' }}>
                <label className="mini-label">Nama Varian</label>
                <input type="text" className="form-input-small bold" value={editingVariant.name} onChange={e => setEditingVariant({...editingVariant, name: e.target.value})} />
              </div>
              <div>
                <label className="mini-label">SKU Varian</label>
                <input type="text" className="form-input-small" value={editingVariant.sku} onChange={e => setEditingVariant({...editingVariant, sku: e.target.value})} />
              </div>
              <div>
                <label className="mini-label">Stok</label>
                <input type="number" className="form-input-small" value={editingVariant.stock} onChange={e => setEditingVariant({...editingVariant, stock: parseInt(e.target.value)})} />
              </div>
              <div>
                <label className="mini-label">Harga Jual (Rp)</label>
                <input type="number" className="form-input-small bold" style={{ color: '#4361ee' }} value={editingVariant.price} onChange={e => setEditingVariant({...editingVariant, price: parseInt(e.target.value)})} />
              </div>
              <div>
                <label className="mini-label">Harga Grosir (Rp)</label>
                <input type="number" className="form-input-small" value={editingVariant.wholesale_price} onChange={e => setEditingVariant({...editingVariant, wholesale_price: parseInt(e.target.value)})} />
              </div>
              <div>
                <label className="mini-label">Modal / COGS (Rp)</label>
                <input type="number" className="form-input-small danger" value={editingVariant.cogs} onChange={e => setEditingVariant({...editingVariant, cogs: parseInt(e.target.value)})} />
              </div>
              <div>
                <label className="mini-label">Berat (Gram)</label>
                <input type="number" className="form-input-small" value={editingVariant.weight} onChange={e => setEditingVariant({...editingVariant, weight: parseInt(e.target.value)})} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="mini-label">Preset Komisi Affiliate (Override)</label>
                <select 
                  className="form-input-small" 
                  value={editingVariant.commission_preset_id || ''} 
                  onChange={e => setEditingVariant({...editingVariant, commission_preset_id: e.target.value})}
                >
                  <option value="">Gunakan Default Produk</option>
                  {presets.map(ps => <option key={ps.id} value={ps.id}>{ps.name}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="mini-label">Preset Komisi Merchant (Override)</label>
                <select 
                  className="form-input-small" 
                  value={editingVariant.merchant_commission_preset_id || ''} 
                  onChange={e => setEditingVariant({...editingVariant, merchant_commission_preset_id: e.target.value})}
                >
                  <option value="">Gunakan Default Produk</option>
                  {merchantPresets.map(ps => <option key={ps.id} value={ps.id}>{ps.name}</option>)}
                </select>
              </div>
            </div>
            <button onClick={handleUpdateVariant} className="btn-save" style={{ width: '100%', padding: '14px' }}>Simpan Perubahan</button>
          </div>
        </div>
      )}

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
