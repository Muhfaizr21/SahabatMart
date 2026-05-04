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
    e.preventDefault();
    setSaving(true);
    fetchJson(`${API}/products/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p)
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
      <div style={{ width: 40, height: 40, border: '4px solid #f3f3f3', borderTop: '4px solid #4361ee', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
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
    <div style={{ padding: '0 20px 40px' }} className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b', marginBottom: 6 }}>
            <Link to="/admin" style={{ color: 'inherit', textDecoration: 'none' }}>Dashboard</Link>
            <i className="bx bx-chevron-right" />
            <Link to="/admin/products" style={{ color: 'inherit', textDecoration: 'none' }}>Produk</Link>
            <i className="bx bx-chevron-right" />
            <span style={{ fontWeight: 600, color: '#1e293b' }}>Ubah SKU</span>
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
            Ubah: {p.name || 'Memuat SKU...'}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => navigate('/admin/products')} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', fontSize: 13, fontWeight: 600, color: '#64748b', cursor: 'pointer' }}>Batal</button>
          <button onClick={handleSubmit} disabled={saving} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#4361ee', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', boxShadow: '0 4px 12px rgba(67, 97, 238, 0.25)' }}>
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        
        {/* Left Column: Basic Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Card 1: Core Info */}
          <div style={{ ...A.card, padding: 25 }}>
            <h5 style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="bx bx-info-circle" style={{ color: '#4361ee' }} /> Informasi Dasar
            </h5>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.02em' }}>Nama Produk</label>
                <input 
                  type="text" 
                  value={p.name} 
                  onChange={e => setP({...p, name: e.target.value})}
                  placeholder="Contoh: MacBook Pro M3"
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, fontWeight: 600, color: '#1e293b', outline: 'none' }} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.02em' }}>SKU / Barcode</label>
                  <input 
                    type="text" 
                    value={p.sku} 
                    onChange={e => setP({...p, sku: e.target.value})}
                    placeholder="E.g. BC-12345678"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, fontWeight: 600, color: '#1e293b', outline: 'none' }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.02em' }}>Berat (Gram) *</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="number" 
                      value={p.weight} 
                      onChange={e => setP({...p, weight: parseInt(e.target.value) || 0})}
                      placeholder="500"
                      style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, fontWeight: 800, color: '#1e293b', outline: 'none' }} 
                    />
                    <span style={{ position: 'absolute', right: 16, top: 12, fontSize: 11, fontWeight: 800, color: '#94a3b8' }}>GR</span>
                  </div>
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.02em' }}>Deskripsi (Format Panjang)</label>
                <textarea 
                  value={p.description} 
                  onChange={e => setP({...p, description: e.target.value})}
                  rows={8}
                  placeholder="Jelaskan detail produk di sini..."
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, color: '#475569', outline: 'none', lineHeight: 1.6, resize: 'vertical' }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Attributes */}
          <div style={{ ...A.card, padding: 25 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h5 style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="bx bx-list-check" style={{ color: '#4361ee' }} /> Atribut Produk
              </h5>
              <Link to="/admin/attributes" style={{ fontSize: 11, fontWeight: 700, color: '#4361ee', textDecoration: 'none' }}>Kelola Pilihan <i className="bx bx-right-arrow-alt" /></Link>
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

          {/* Card 3: Tier Commission Matrix (Req 1 & 2) */}
          <div style={{ ...A.card, padding: 25 }}>
            <h5 style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="bx bx-sitemap" style={{ color: '#4361ee' }} /> Matriks Komisi per Tier
            </h5>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 15 }}>
              Atur persentase komisi khusus untuk produk ini berdasarkan jenjang affiliate. Jika kosong, sistem akan menggunakan nilai default.
            </p>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', padding: '10px 15px', borderBottom: '1px solid #f1f5f9' }}>Jenjang Membership</th>
                    <th style={{ textAlign: 'center', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', padding: '10px 15px', borderBottom: '1px solid #f1f5f9' }}>Rate Default</th>
                    <th style={{ textAlign: 'right', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', padding: '10px 15px', borderBottom: '1px solid #f1f5f9' }}>Rate Khusus (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {tiers.sort((a,b) => a.level - b.level).map(tier => {
                    const custom = tierComms.find(x => x.membership_tier_id === tier.id);
                    const currentRate = custom ? (custom.commission_rate * 100).toFixed(1) : '';
                    
                    return (
                      <tr key={tier.id}>
                        <td style={{ padding: '12px 15px', borderBottom: '1px solid #f8fafc' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: tier.color }} />
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{tier.name}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', padding: '12px 15px', borderBottom: '1px solid #f8fafc', fontSize: 12, color: '#94a3b8' }}>
                          {(tier.base_commission_rate * 100).toFixed(1)}%
                        </td>
                        <td style={{ textAlign: 'right', padding: '12px 15px', borderBottom: '1px solid #f8fafc' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
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
                                style={{ width: 80, padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0', textAlign: 'right', fontSize: 13, fontWeight: 700 }}
                            />
                            {updatingTier === tier.id && <i className="bx bx-loader-alt bx-spin" style={{ color: '#4361ee' }} />}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card 4: Commission Preset Selector */}
          <div style={{ ...A.card, padding: 25 }}>
            <h5 style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="bx bx-git-branch" style={{ color: '#7c3aed', transform: 'rotate(90deg)' }} /> Preset Komisi Multi-Level (Upline)
            </h5>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
              Assign preset untuk mendistribusikan komisi secara otomatis ke seluruh jaringan upline affiliate.
            </p>

            <select
              value={p.commission_preset_id || ''}
              onChange={e => setP(prev => ({ ...prev, commission_preset_id: e.target.value || null }))}
              style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, fontWeight: 600, color: '#1e293b', outline: 'none', marginBottom: 16 }}
            >
              <option value="">-- Tidak Pakai Preset (Gunakan Tier Default) --</option>
              {presets.filter(pr => pr.is_active).map(pr => (
                <option key={pr.id} value={pr.id}>{pr.name}</option>
              ))}
            </select>

            <div style={{ height: 1, background: '#f1f5f9', margin: '16px 0' }} />

            <h5 style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="bx bx-matrix" style={{ color: '#10b981' }} /> Preset Komisi Tier (Matrix)
            </h5>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
              Pilih preset matriks komisi untuk menetapkan rate khusus per jenjang membership.
            </p>

            <select
              value={p.tier_commission_preset_id || ''}
              onChange={e => setP(prev => ({ ...prev, tier_commission_preset_id: e.target.value || null }))}
              style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, fontWeight: 600, color: '#1e293b', outline: 'none', marginBottom: 16 }}
            >
              <option value="">-- Tidak Pakai Preset (Gunakan Rate Produk) --</option>
              {tierPresets.filter(pr => pr.is_active).map(pr => (
                <option key={pr.id} value={pr.id}>{pr.name}</option>
              ))}
            </select>

            {/* Preview preset yang dipilih */}
            {(p.commission_preset_id || p.tier_commission_preset_id) && (
              <div style={{ marginTop: 10 }}>
                {p.commission_preset_id && (() => {
                  const selected = presets.find(pr => pr.id === p.commission_preset_id);
                  if (!selected) return null;
                  return (
                    <div style={{ background: 'linear-gradient(135deg, #7c3aed08, #4361ee05)', border: '1px solid #7c3aed20', borderRadius: 12, padding: 16, marginBottom: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.04em' }}>Multi-Level: {selected.name}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {(selected.levels || []).map((lv, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff' }}>{lv.level}</div>
                            <div style={{ flex: 1, fontSize: 12, color: '#475569', fontWeight: 600 }}>Level {lv.level}</div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: '#7c3aed' }}>{(lv.rate * 100).toFixed(1)}%</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {p.tier_commission_preset_id && (() => {
                  const selected = tierPresets.find(pr => pr.id === p.tier_commission_preset_id);
                  if (!selected) return null;
                  return (
                    <div style={{ background: 'linear-gradient(135deg, #10b98108, #05966905)', border: '1px solid #10b98120', borderRadius: 12, padding: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#059669', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.04em' }}>Tier Matrix: {selected.name}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {(selected.tiers || []).map((tItem, idx) => {
                          const tierObj = tiers.find(t => t.id === tItem.membership_tier_id);
                          return (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 10, height: 10, borderRadius: '50%', background: tierObj?.color || '#ccc' }} />
                              <div style={{ flex: 1, fontSize: 12, color: '#475569', fontWeight: 600 }}>{tierObj?.name}</div>
                              <div style={{ fontSize: 14, fontWeight: 800, color: '#059669' }}>{(tItem.commission_rate * 100).toFixed(1)}%</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Organization & Media */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Organization */}
          <div style={{ ...A.card, padding: 20 }}>
             <h5 style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 16 }}>Pengaturan Pasar</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Kategori</label>
                  <select style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 600 }} value={p.category} onChange={e => setP({...p, category: e.target.value})}>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Merek / Brand</label>
                  <select style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 600 }} value={p.brand} onChange={e => setP({...p, brand: e.target.value})}>
                    <option value="">-- Tanpa Brand Spesifik --</option>
                    {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Status</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" onClick={() => setP({...p, status: 'active'})} style={{ flex: 1, padding: '8px', borderRadius: 6, fontSize: 12, fontWeight: 700, border: '1px solid #e2e8f0', background: p.status === 'active' ? '#dcfce7' : '#fff', color: p.status === 'active' ? '#166534' : '#64748b' }}>Aktif</button>
                    <button type="button" onClick={() => setP({...p, status: 'taken_down'})} style={{ flex: 1, padding: '8px', borderRadius: 6, fontSize: 12, fontWeight: 700, border: '1px solid #e2e8f0', background: p.status === 'taken_down' ? '#fee2e2' : '#fff', color: p.status === 'taken_down' ? '#991b1b' : '#64748b' }}>Ditarik</button>
                  </div>
                </div>
              </div>
           </div>

           {/* Pricing & Commissions */}
           <div style={{ ...A.card, padding: 20, background: '#f5f7ff' }}>
              <h5 style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 16 }}>Keuangan & Komisi</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                 <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Harga Utama (Rp)</label>
                    <input type="number" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 15, fontWeight: 800, color: '#4361ee' }} value={p.price} onChange={e => setP({...p, price: parseFloat(e.target.value)})} />
                 </div>
                 <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Harga Coret (Diskon)</label>
                    <input type="number" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 600, color: '#64748b' }} value={p.old_price} onChange={e => setP({...p, old_price: parseFloat(e.target.value)})} />
                 </div>
                 <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Modal Awal / COGS (Rp)</label>
                    <input type="number" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 600, color: '#ef4444' }} value={p.cogs} onChange={e => setP({...p, cogs: parseFloat(e.target.value)})} />
                 </div>

                 <div style={{ height: 1, background: '#e2e8f0', margin: '8px 0' }} />
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Potongan Merchant (%)</label>
                    <input type="number" step="0.01" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, background: '#fffbeb', color: '#b45309', fontWeight: 700 }} value={p.merchant_commission_percent} onChange={e => setP({...p, merchant_commission_percent: parseFloat(e.target.value) || 0})} />
                  </div>

                 <div style={{ height: 1, background: '#e2e8f0', margin: '8px 0' }} />

                 <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Jumlah Stok</label>
                    <input type="number" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, fontWeight: 700 }} value={p.stock} onChange={e => setP({...p, stock: parseInt(e.target.value)})} />
                 </div>
              </div>
           </div>
          <div style={{ ...A.card, padding: 20 }}>
             <h5 style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 16 }}>Media Utama</h5>
             <div style={{ border: '2px dashed #f1f5f9', borderRadius: 12, padding: 10, textAlign: 'center', position: 'relative' }}>
                <img src={formatImage(p.image)} style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8 }} alt="Main" />
                <label style={{ position: 'absolute', bottom: 15, right: 15, width: 32, height: 32, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
                   {uploading ? <div style={{ width: 14, height: 14, border: '2px solid #eee', borderTop: '2px solid #4361ee', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} /> : <i className="bx bx-camera" style={{ fontSize: 18, color: '#64748b' }} />}
                   <input type="file" style={{ display: 'none' }} accept="image/*" onChange={e => handleUpload(e, 'main')} />
                </label>
             </div>
             
             <h5 style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginTop: 20, marginBottom: 10 }}>Galeri</h5>
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
