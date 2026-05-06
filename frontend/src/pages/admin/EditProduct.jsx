import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson, formatImage } from '../../lib/api';
import toast from 'react-hot-toast';
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
    tier_commission_preset_id: ''
  });

  const [tiers, setTiers] = useState([]);
  const [tierComms, setTierComms] = useState([]);
  const [updatingTier, setUpdatingTier] = useState(null);
  const [presets, setPresets] = useState([]);
  const [tierPresets, setTierPresets] = useState([]);

  const [gallery, setGallery] = useState([]);
  const [selectedAttrs, setSelectedAttrs] = useState({});

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
    ]).then(([cats, brds, atts, tiersData, tComms, prod, prs, tprs]) => {
      setPresets(Array.isArray(prs) ? prs : (prs?.data || []));
      setTierPresets(Array.isArray(tprs) ? tprs : (tprs?.data || []));
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
      console.error("Fetch error:", err);
      setError(err.message || "Gagal mengambil data produk");
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
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
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
    } catch (err) { 
      toast.error("Gagal mengunggah ke server: " + err.message);
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
            commission_rate: parseFloat(rate) / 100
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
      toast.error("Gagal update: " + err.message);
    })
    .finally(() => setSaving(false));
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

            <div className="input-row" style={{ marginTop: '20px', marginBottom: '20px' }}>
              <div style={{ flex: 1 }}>
                <label className="mini-label">Preset Komisi Chain</label>
                <select 
                  className="form-select" 
                  value={p.commission_preset_id || ''} 
                  onChange={e => setP({...p, commission_preset_id: e.target.value || null})}
                >
                  <option value="">-- Gunakan Default --</option>
                  {presets.map(pr => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="mini-label">Preset Komisi Tier</label>
                <select 
                  className="form-select" 
                  value={p.tier_commission_preset_id || ''} 
                  onChange={e => setP({...p, tier_commission_preset_id: e.target.value || null})}
                >
                  <option value="">-- Gunakan Default --</option>
                  {tierPresets.map(tp => <option key={tp.id} value={tp.id}>{tp.name}</option>)}
                </select>
              </div>
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
             
             <h5 className="sub-label-uppercase">Galeri Produk</h5>
             <div className="gallery-grid">
                {gallery.map((img, idx) => (
                  <div key={idx} className="gallery-item">
                    <img src={formatImage(img)} alt="" />
                    <button onClick={() => removeGalleryImage(idx)} className="btn-remove-img"><i className="bx bx-x" /></button>
                  </div>
                ))}
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
        
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>
  );
}
