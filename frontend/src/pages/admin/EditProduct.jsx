import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson, formatImage, getSiteUrl } from '../../lib/api';
import toast from 'react-hot-toast';
import MediaLibraryModal from '../../components/admin/MediaLibraryModal';

import AdminSelect from '../../components/admin/AdminSelect';
import JoditEditor from 'jodit-react';
import { marked } from 'marked';

const API = ADMIN_API_BASE;

// ─── WooCommerce Tab Rules per Product Type ───────────────────────────────────
const TABS_BY_TYPE = {
  simple:   ['general', 'inventory', 'shipping', 'linked', 'attributes', 'variations', 'advanced', 'seo', 'komisi'],
  variable: ['general', 'inventory', 'shipping', 'linked', 'attributes', 'variations', 'advanced', 'seo', 'komisi'],
  digital:  ['general', 'inventory',             'linked', 'attributes', 'variations', 'advanced', 'seo', 'komisi'],
  grouped:  ['general', 'inventory',             'linked', 'attributes', 'variations', 'advanced', 'seo', 'komisi'],
  external: ['general',                          'linked', 'attributes',               'advanced', 'seo', 'komisi'],
};

const ALL_TABS = [
  { id: 'general',    label: 'General',         icon: 'bx-cog'         },
  { id: 'inventory',  label: 'Inventori',        icon: 'bx-box'         },
  { id: 'shipping',   label: 'Pengiriman',       icon: 'bx-package'     },
  { id: 'linked',     label: 'Produk Terkait',   icon: 'bx-link'        },
  { id: 'attributes', label: 'Atribut',          icon: 'bx-list-check'  },
  { id: 'variations', label: 'Variasi',          icon: 'bx-copy-alt'    },
  { id: 'advanced',   label: 'Lanjutan',         icon: 'bx-slider-alt'  },
  { id: 'seo',        label: 'SEO',              icon: 'bx-search-alt'  },
  { id: 'komisi',     label: 'Komisi',           icon: 'bx-trending-up' },
];

const PRODUCT_TYPES = [
  { value: 'simple',   label: 'Produk Sederhana' },
  { value: 'variable', label: 'Produk Variabel' },
  { value: 'digital',  label: 'Produk Digital / Unduhan' },
  { value: 'grouped',  label: 'Produk Bundel / Grup' },
  { value: 'external', label: 'Produk Eksternal / Afiliasi' },
];

// ─── Shared Styles ────────────────────────────────────────────────────────────
const S = {
  input: {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: '1.5px solid #e2e8f0', fontSize: 13.5, color: '#1e293b',
    outline: 'none', fontFamily: "'Inter', sans-serif",
    background: '#fff', boxSizing: 'border-box', transition: 'border-color 0.2s',
  },
  select: {
    width: '100%', padding: '10px 36px 10px 14px', borderRadius: 10,
    border: '1.5px solid #e2e8f0', fontSize: 13.5, color: '#1e293b',
    outline: 'none', fontFamily: "'Inter', sans-serif",
    background: '#fff', boxSizing: 'border-box', cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
  },
  lbl:  { display: 'block', fontSize: 12.5, fontWeight: 700, color: '#374151', marginBottom: 6 },
  hint: { fontSize: 11.5, color: '#94a3b8', marginTop: 5, lineHeight: 1.5 },
};

// ─── Sub-Components ────────────────────────────────────────────────────────────

const Toggle = ({ checked, onChange, label, desc }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
    <div>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1e293b' }}>{label}</div>
      {desc && <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>{desc}</div>}
    </div>
    <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, flexShrink: 0, cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ display: 'none' }} />
      <span style={{ position: 'absolute', inset: 0, borderRadius: 24, transition: '0.25s', background: checked ? '#6366f1' : '#e2e8f0' }}>
        <span style={{ position: 'absolute', left: checked ? 22 : 2, top: 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: '0.25s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
      </span>
    </label>
  </div>
);

const SeoMeter = ({ value, max, warningAt, label }) => {
  const pct   = Math.min((value / max) * 100, 100);
  const color = value === 0 ? '#e2e8f0' : value < warningAt ? '#f59e0b' : value <= max ? '#10b981' : '#ef4444';
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 4 }}>
        <span>{label}</span><span style={{ color, fontWeight: 700 }}>{value}/{max}</span>
      </div>
      <div style={{ height: 3, borderRadius: 3, background: '#f1f5f9' }}>
        <div style={{ height: '100%', borderRadius: 3, background: color, width: `${pct}%`, transition: 'width 0.3s' }} />
      </div>
    </div>
  );
};

const InfoBanner = ({ icon, color, bg, border, children }) => (
  <div style={{ padding: '13px 16px', background: bg, borderRadius: 12, border: `1px solid ${border}`, display: 'flex', gap: 10 }}>
    <i className={`bx ${icon}`} style={{ color, fontSize: 18, flexShrink: 0, marginTop: 1 }} />
    <div style={{ fontSize: 12.5, color, lineHeight: 1.65 }}>{children}</div>
  </div>
);

// Product search input with autocomplete (for Linked Products)
const ProductSearchInput = ({ items, onAdd, onRemove, label, placeholder, excludeLabel }) => {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]       = useState(false);
  const debRef = useRef(null);
  const wrapRef = useRef(null);

  const search = (q) => {
    setQuery(q);
    if (debRef.current) clearTimeout(debRef.current);
    if (!q || q.length < 2) { setResults([]); return; }
    debRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res  = await fetchJson(`${API}/products?search=${encodeURIComponent(q)}&limit=8`);
        const data = Array.isArray(res) ? res : (res?.data || res?.products || []);
        setResults(data.filter(p => !items.find(i => i.id === p.id)));
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 400);
  };

  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>{label}</label>
      <div ref={wrapRef} style={{ position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          <input className="wc-inp" style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 12, fontSize: 13.5, background: '#f8fafc', color: '#1e293b', outline: 'none' }} value={query}
            onChange={e => { search(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder} />
          {loading && <i className="bx bx-loader-alt bx-spin" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />}
        </div>
        {open && results.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 12, zIndex: 200, boxShadow: '0 10px 30px rgba(0,0,0,0.12)', marginTop: 4, overflow: 'hidden' }}>
            {results.slice(0, 6).map(r => (
              <button key={r.id} type="button"
                onClick={() => { onAdd({ id: r.id, name: r.name, image: r.image, price: r.price }); setQuery(''); setResults([]); setOpen(false); }}
                style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <img src={formatImage(r.image)} alt="" style={{ width: 34, height: 34, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2e8f0', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Rp {(r.price || 0).toLocaleString('id-ID')}</div>
                </div>
                <i className="bx bx-plus" style={{ color: '#6366f1', fontSize: 18, flexShrink: 0 }} />
              </button>
            ))}
          </div>
        )}
      </div>
      {items.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <img src={formatImage(item.image)} alt="" style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2e8f0', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#334155' }}>{item.name}</span>
              <button type="button" onClick={() => onRemove(idx)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 18, display: 'flex', alignItems: 'center', padding: 0 }}>
                <i className="bx bx-x" />
              </button>
            </div>
          ))}
        </div>
      )}
      {items.length === 0 && (
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>{excludeLabel}</div>
      )}
    </div>
  );
};

const SideCard = ({ title, icon, children }) => (
  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
    <div style={{ padding: '13px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
      <i className={`bx ${icon}`} style={{ color: '#6366f1', fontSize: 16 }} />
      <span style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>{title}</span>
    </div>
    <div style={{ padding: '16px 18px' }}>{children}</div>
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────
export default function AdminEditProduct() {
  const navigate = useNavigate();
  const location = useLocation();
  const productId = new URLSearchParams(location.search).get('id');

  const [activeTab,   setActiveTab]   = useState('general');
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [error,       setError]       = useState(null);

  const [categories,  setCategories]  = useState([]);
  const [brands,      setBrands]      = useState([]);
  const [attrs,       setAttrs]       = useState([]);
  const [presets,     setPresets]     = useState([]);
  const [gallery,     setGallery]     = useState([]);
  const [selAttrs,    setSelAttrs]    = useState({});
  const [slugManual,  setSlugManual]  = useState(false);

  // Variants
  const [variants,          setVariants]          = useState([]);
  const [newVariant,        setNewVariant]        = useState({
    name: '', sku: '', price: '', old_price: '', cogs: '',
    stock: 0, weight: '', length: '', width: '', height: '', status: 'active', is_virtual: false, is_downloadable: false,
    download_limit: '', download_expiry: '', downloadable_files: '[]',
    description: '', tax_status: 'taxable', tax_class: 'standard',
    manage_stock: true, commission_preset_id: ''
  });
  const [showVariantModal,  setShowVariantModal]  = useState(false);
  const [editingVariant,    setEditingVariant]    = useState(null);
  const [variantFiles,      setVariantFiles]      = useState([]);
  const [bulkAction,        setBulkAction]        = useState('');

  // Tier commission
  const [tiers,        setTiers]       = useState([]);
  const [tierComms,    setTierComms]   = useState([]);
  const [updatingTier, setUpdatingTier] = useState(null);

  // Media
  const [mediaOpen,  setMediaOpen]  = useState(false);
  const [mediaType,  setMediaType]  = useState('main');
  const [downloadableFiles, setDownloadableFiles] = useState([]);

  const [p, setP] = useState({
    id: '', name: '', short_description: '', description: '',
    product_type: 'simple',
    price: '', old_price: '', cogs: '', wholesale_price: '',
    tax_status: 'taxable', tax_class: 'standard',
    product_url: '', button_text: 'Beli Sekarang',
    sku: '', manage_stock: true, stock: 0, low_stock_threshold: 5,
    backorders: 'no', sold_individually: false,
    weight: '', length: '', width: '', height: '',
    purchase_note: '', menu_order: 0, enable_reviews: true,
    seo_title: '', meta_description: '', focus_keyword: '', slug: '',
    commission_preset_id: null, tier_commission_preset_id: null, merchant_commission_preset_id: null,
    category: '', brand: '', tags: '',
    image: '', images: '[]',
    status: 'active', visibility: 'public',
    attributes: '{}',
    is_virtual: false, is_downloadable: false,
    download_limit: '', download_expiry: '',
    sale_start: '', sale_end: '',
    upsells: [],
    crosssells: [],
  });

  const set = (key, val) => setP(prev => ({ ...prev, [key]: val }));

  // ── Derived tabs ──
  const visibleTabIds = TABS_BY_TYPE[p.product_type] || TABS_BY_TYPE.simple;
  const visibleTabs   = ALL_TABS.filter(t => visibleTabIds.includes(t.id));

  useEffect(() => {
    const ids = TABS_BY_TYPE[p.product_type] || TABS_BY_TYPE.simple;
    if (!ids.includes(activeTab)) setActiveTab('general');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.product_type]);

  // ── Auto-slug ──
  useEffect(() => {
    if (!slugManual) {
      const slug = (p.name || '').toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
      set('slug', slug);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.name]);

  // ── Fetch all data ──
  useEffect(() => {
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
      fetchJson(`${API}/products/variants?product_id=${productId}`),
      fetchJson(`${API}/products?limit=1000`),
    ]).then(([cats, brds, atts, tiersData, tComms, prod, prs, vars, allProds]) => {
      setCategories(Array.isArray(cats) ? cats : (cats?.data || []));
      setBrands(Array.isArray(brds) ? brds : (brds?.data || []));
      setAttrs(Array.isArray(atts) ? atts : (atts?.data || []));
      setTiers(Array.isArray(tiersData) ? tiersData : (tiersData?.data || []));
      setTierComms(Array.isArray(tComms) ? tComms : (tComms?.data || []));
      setPresets((Array.isArray(prs) ? prs : (prs?.data || [])).filter(pr => pr.is_active));
      setVariants(Array.isArray(vars) ? vars : (vars?.data || []));

      const allProdsList = Array.isArray(allProds) ? allProds : (allProds?.data || allProds?.products || []);

      const item = prod?.data || prod;
      if (item && item.id) {
        let upsIds = [];
        let crsIds = [];
        try { upsIds = JSON.parse(item.upsells || '[]'); } catch(_e){}
        try { crsIds = JSON.parse(item.crosssells || '[]'); } catch(_e){}

        const upsObjs = Array.isArray(upsIds) ? upsIds.map(id => allProdsList.find(ap => ap.id === id)).filter(Boolean) : [];
        const crsObjs = Array.isArray(crsIds) ? crsIds.map(id => allProdsList.find(ap => ap.id === id)).filter(Boolean) : [];

        setP({
          id: item.id,
          name: item.name || '',
          short_description: item.short_description ? (/<[a-z][\s\S]*>/i.test(item.short_description) ? item.short_description : marked.parse(item.short_description, { breaks: true, async: false })) : '',
          description: item.description ? (/<[a-z][\s\S]*>/i.test(item.description) ? item.description : marked.parse(item.description, { breaks: true, async: false })) : '',
          product_type: item.product_type || 'simple',
          price: item.price !== undefined && item.price !== null ? item.price : '',
          old_price: item.old_price ? item.old_price : '',
          wholesale_price: item.wholesale_price ? item.wholesale_price : '',
          cogs: item.cogs ? item.cogs : '',
          tax_status: item.tax_status || 'taxable',
          tax_class: item.tax_class || 'standard',
          product_url: item.product_url || '',
          button_text: item.button_text || 'Beli Sekarang',
          sku: item.sku || '',
          manage_stock: item.manage_stock !== false,
          stock: item.stock || 0,
          low_stock_threshold: item.low_stock_threshold || 5,
          backorders: item.backorders || 'no',
          sold_individually: !!item.sold_individually,
          weight: item.weight || '',
          length: item.length || '',
          width: item.width || '',
          height: item.height || '',
          purchase_note: item.purchase_note || '',
          menu_order: item.menu_order || 0,
          enable_reviews: item.enable_reviews !== false,
          seo_title: item.seo_title || '',
          meta_description: item.seo_description || '',
          focus_keyword: item.seo_keywords || '',
          slug: item.slug || '',
          commission_preset_id: item.commission_preset_id || null,
          tier_commission_preset_id: item.tier_commission_preset_id || null,
          merchant_commission_preset_id: item.merchant_commission_preset_id || null,
          category: item.category || '',
          brand: item.brand || '',
          tags: item.tags || '',
          image: item.image || '',
          images: item.images || '[]',
          status: item.status || 'active',
          visibility: item.visibility || 'public',
          attributes: item.attributes || '{}',
          is_virtual: !!item.is_virtual,
          is_downloadable: !!item.is_downloadable,
          download_limit: item.download_limit !== undefined && item.download_limit !== -1 ? item.download_limit : '',
          download_expiry: item.download_expiry !== undefined && item.download_expiry !== -1 ? item.download_expiry : '',
          sale_start: item.sale_start || '',
          sale_end: item.sale_end || '',
          upsells: upsObjs,
          crosssells: crsObjs,
        });
        try {
          setSelAttrs(JSON.parse(item.attributes || '{}'));
          setGallery(JSON.parse(item.images || '[]'));
          const files = JSON.parse(item.downloadable_files || '[]');
          setDownloadableFiles(Array.isArray(files) ? files : []);
        } catch (_e) {
          setSelAttrs({});
          setGallery([]);
          setDownloadableFiles([]);
        }
        // Preserve slug from server
        setSlugManual(true);
      } else {
        setError('Produk tidak ditemukan.');
      }
    }).catch(err => setError(err.message || 'Gagal memuat data'))
      .finally(() => setLoading(false));
  }, [productId]);

  const handleAttrChange = (name, val, checked) => {
    setSelAttrs(prev => {
      const cur  = Array.isArray(prev[name]) ? prev[name] : [];
      const next = checked ? [...cur, val] : cur.filter(v => v !== val);
      const obj  = { ...prev, [name]: next };
      set('attributes', JSON.stringify(obj));
      return obj;
    });
  };

  const handleUpload = async (e, type = 'main') => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return; }
    setUploading(true);
    const fd = new FormData(); fd.append('image', file);
    try {
      const resp = await fetch(`${API}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'ngrok-skip-browser-warning': 'true' },
        body: fd,
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const rd  = await resp.json();
      const url = rd?.data?.url || rd?.url;
      if (!url) throw new Error(rd.message || 'No URL');
      if (type === 'main') {
        set('image', url);
      } else {
        setGallery(prev => { const n = [...prev, url]; set('images', JSON.stringify(n)); return n; });
      }
      toast.success('Upload berhasil');
    } catch (err) { toast.error('Upload gagal: ' + err.message); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const removeGallery = (idx) =>
    setGallery(prev => { const n = prev.filter((_, i) => i !== idx); set('images', JSON.stringify(n)); return n; });

  const handleSubmit = (statusOverride) => {
    if (!p.name.trim()) { toast.error('Nama produk wajib diisi!'); return; }
    
    // External product check
    if (p.product_type === 'external') {
      if (!p.product_url.trim()) { toast.error('URL Produk Eksternal wajib diisi!'); return; }
      if (!p.product_url.startsWith('http://') && !p.product_url.startsWith('https://')) {
        toast.error('URL Produk Eksternal harus diawali dengan http:// atau https://'); return;
      }
    }

    if (p.product_type !== 'grouped' && p.product_type !== 'variable' && (!p.price || parseFloat(p.price) <= 0)) {
      toast.error('Harga jual wajib diisi!'); return; 
    }
    
    if (p.product_type !== 'grouped' && p.product_type !== 'variable') {
      if (parseFloat(p.price) <= parseFloat(p.cogs)) { toast.error('Harga Jual harus lebih besar dari Harga Modal (COGS)!'); return; }
      if (parseFloat(p.old_price) > 0 && parseFloat(p.old_price) <= parseFloat(p.price)) {
        toast.error('Harga Coret (Normal) harus lebih besar dari Harga Jual (Sale)!'); return;
      }
    }


    
    if (p.manage_stock && parseInt(p.stock) < 0) {
      toast.error('Stok produk tidak boleh negatif!'); return;
    }
    
    if (parseInt(p.low_stock_threshold) < 0) {
      toast.error('Batas stok rendah (Low Stock Threshold) tidak boleh negatif!'); return;
    }

    // Sale schedule logic
    if (p.sale_start && p.sale_end) {
      if (new Date(p.sale_start) > new Date(p.sale_end)) {
        toast.error('Tanggal berakhir diskon (Sale End) harus setelah tanggal mulai (Sale Start)!'); return;
      }
    }

    // Wholesale logic
    if (parseFloat(p.wholesale_price) > 0) {
      if (parseFloat(p.wholesale_price) >= parseFloat(p.price)) {
        toast.error('Harga Grosir harus lebih kecil dari Harga Jual!'); return;
      }
      if (parseFloat(p.wholesale_price) <= parseFloat(p.cogs)) {
        toast.error('Harga Grosir harus lebih besar dari Harga Modal (COGS)!'); return;
      }
    }

    if (p.is_downloadable && downloadableFiles.filter(f => f.name.trim() || f.file_url.trim()).length === 0) {
      toast.error('Produk downloadable wajib memiliki minimal satu file yang disertakan!'); return;
    }
    setSaving(true);
    const payload = {
      ...p,
      status:              statusOverride || p.status,
      price:               parseFloat(p.price) || 0,
      old_price:           parseFloat(p.old_price) || 0,
      wholesale_price:     parseFloat(p.wholesale_price) || 0,
      cogs:                parseFloat(p.cogs) || 0,
      weight:              parseInt(p.weight) || 0,
      length:              parseInt(p.length) || 0,
      width:               parseInt(p.width)  || 0,
      height:              parseInt(p.height) || 0,
      stock:               parseInt(p.stock) || 0,
      low_stock_threshold: parseInt(p.low_stock_threshold) || 5,
      menu_order:          parseInt(p.menu_order) || 0,
      product_type:        p.product_type || 'simple',
      is_virtual:          !!p.is_virtual,
      is_downloadable:     !!p.is_downloadable,
      download_limit:      p.download_limit === '' ? -1 : parseInt(p.download_limit),
      download_expiry:     p.download_expiry === '' ? -1 : parseInt(p.download_expiry),
      downloadable_files:  JSON.stringify(downloadableFiles.filter(f => f.name.trim() || f.file_url.trim())),
      visibility:          p.visibility || 'public',
      seo_title:           p.seo_title || '',
      seo_description:     p.meta_description || '',
      seo_keywords:        p.focus_keyword || '',
      short_description:   p.short_description || '',
      commission_preset_id:        p.commission_preset_id        || null,
      tier_commission_preset_id:   p.tier_commission_preset_id   || null,
      merchant_commission_preset_id: p.merchant_commission_preset_id || null,
      sale_start:          p.sale_start || '',
      sale_end:            p.sale_end || '',
      tax_class:           p.tax_class || 'standard',
      upsells:             JSON.stringify((p.upsells || []).map(u => typeof u === 'object' && u ? u.id : u)),
      crosssells:          JSON.stringify((p.crosssells || []).map(u => typeof u === 'object' && u ? u.id : u)),
    };
    fetchJson(`${API}/products/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    .then(() => { toast.success('Produk berhasil diperbarui!'); navigate('/admin/products'); })
    .catch(err => toast.error('Gagal update: ' + err.message))
    .finally(() => setSaving(false));
  };

  const handleTierCommUpdate = (tierId, rate) => {
    setUpdatingTier(tierId);
    fetchJson(`${API}/products/tier-commissions/update`, {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, membership_tier_id: parseInt(tierId), commission_rate: parseFloat(rate) })
    }).then(resp => {
      const updated = resp.data || resp;
      setTierComms(prev => {
        const idx = prev.findIndex(x => x.membership_tier_id === updated.membership_tier_id);
        if (idx > -1) { const n = [...prev]; n[idx] = updated; return n; }
        return [...prev, updated];
      });
      toast.success('Komisi tier diperbarui');
    }).catch(e => toast.error(e.message))
      .finally(() => setUpdatingTier(null));
  };

  // Variant handlers
  const handleAddVariant = () => {
    if (!newVariant.name.trim()) { toast.error('Nama varian wajib diisi!'); return; }
    if (variants.some(v => v.name.toLowerCase() === newVariant.name.trim().toLowerCase())) { toast.error('Varian dengan nama tersebut sudah ada!'); return; }
    if (parseFloat(newVariant.price) <= parseFloat(newVariant.cogs)) { toast.error('Harga Jual varian harus lebih besar dari Harga Modal (COGS)!'); return; }
    if (parseFloat(newVariant.old_price) > 0 && parseFloat(newVariant.old_price) <= parseFloat(newVariant.price)) {
      toast.error('Harga Coret (Normal) harus lebih besar dari Harga Jual (Sale)!'); return;
    }
    if (!newVariant.is_virtual && !newVariant.is_downloadable && parseInt(newVariant.weight) <= 0) {
      toast.error('Berat varian fisik wajib diisi (> 0)!'); return;
    }
    if (newVariant.manage_stock && parseInt(newVariant.stock) < 0) {
      toast.error('Stok varian tidak boleh negatif!'); return;
    }
    const payload = {
      ...newVariant,
      product_id: productId,
      price: parseFloat(newVariant.price) || 0,
      old_price: parseFloat(newVariant.old_price) || 0,
      cogs: parseFloat(newVariant.cogs) || 0,
      weight: parseInt(newVariant.weight) || 0,
      length: parseInt(newVariant.length) || 0,
      width: parseInt(newVariant.width) || 0,
      height: parseInt(newVariant.height) || 0,
      stock: parseInt(newVariant.stock) || 0,
      download_limit: newVariant.download_limit === '' ? -1 : parseInt(newVariant.download_limit),
      download_expiry: newVariant.download_expiry === '' ? -1 : parseInt(newVariant.download_expiry),
      downloadable_files: JSON.stringify(variantFiles),
      commission_preset_id: newVariant.commission_preset_id || null,
    };
    fetchJson(`${API}/products/variants/add`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }).then(resp => {
      setVariants(prev => [...prev, resp.data || resp]);
      setNewVariant({
        name: '', sku: '', price: '', old_price: '', cogs: '',
        stock: 0, weight: '', length: '', width: '', height: '', status: 'active', is_virtual: false, is_downloadable: false,
        download_limit: '', download_expiry: '', downloadable_files: '[]',
        description: '', tax_status: 'taxable', tax_class: 'standard',
        manage_stock: true, commission_preset_id: ''
      });
      setVariantFiles([]);
      setShowVariantModal(false);
      toast.success('Varian berhasil ditambahkan');
    }).catch(e => toast.error(e.message));
  };

  const handleUpdateVariant = () => {
    if (!editingVariant.name.trim()) { toast.error('Nama varian wajib diisi!'); return; }
    if (variants.some(v => v.id !== editingVariant.id && v.name.toLowerCase() === editingVariant.name.trim().toLowerCase())) { toast.error('Varian dengan nama tersebut sudah ada!'); return; }
    if (parseFloat(editingVariant.price) <= parseFloat(editingVariant.cogs)) { toast.error('Harga Jual varian harus lebih besar dari Harga Modal (COGS)!'); return; }
    if (parseFloat(editingVariant.old_price) > 0 && parseFloat(editingVariant.old_price) <= parseFloat(editingVariant.price)) {
      toast.error('Harga Coret (Normal) harus lebih besar dari Harga Jual (Sale)!'); return;
    }

    if (editingVariant.manage_stock && parseInt(editingVariant.stock) < 0) {
      toast.error('Stok varian tidak boleh negatif!'); return;
    }
    const payload = {
      ...editingVariant,
      price: parseFloat(editingVariant.price) || 0,
      old_price: parseFloat(editingVariant.old_price) || 0,
      cogs: parseFloat(editingVariant.cogs) || 0,
      weight: parseInt(editingVariant.weight) || 0,
      length: parseInt(editingVariant.length) || 0,
      width: parseInt(editingVariant.width) || 0,
      height: parseInt(editingVariant.height) || 0,
      stock: parseInt(editingVariant.stock) || 0,
      download_limit: editingVariant.download_limit === '' ? -1 : parseInt(editingVariant.download_limit),
      download_expiry: editingVariant.download_expiry === '' ? -1 : parseInt(editingVariant.download_expiry),
      downloadable_files: JSON.stringify(variantFiles),
      commission_preset_id: editingVariant.commission_preset_id || null,
    };
    fetchJson(`${API}/products/variants/update`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }).then(() => {
      setVariants(prev => prev.map(v => v.id === editingVariant.id ? { ...editingVariant, ...payload } : v));
      setEditingVariant(null);
      setVariantFiles([]);
      toast.success('Varian diperbarui');
    }).catch(e => toast.error(e.message));
  };

  const handleDeleteVariant = (id) => {
    if (!window.confirm('Hapus varian ini?')) return;
    fetchJson(`${API}/products/variants/delete?id=${id}`, { method: 'DELETE' })
      .then(() => { setVariants(prev => prev.filter(v => v.id !== id)); toast.success('Varian dihapus'); })
      .catch(e => toast.error(e.message));
  };

  const generateCartesianVariations = () => {
    const keys = Object.keys(selAttrs).filter(k => selAttrs[k] && selAttrs[k].length > 0);
    if (keys.length === 0) {
      toast.error('Harap pilih minimal satu atribut dan nilainya di tab Atribut!');
      return;
    }

    const cartesian = (sets) => {
      return sets.reduce((acc, set) => {
        return acc.flatMap(x => set.map(y => [...x, y]));
      }, [[]]);
    };

    const sets = keys.map(k => selAttrs[k]);
    const combinations = cartesian(sets);

    if (!window.confirm(`Sistem akan menghasilkan ${combinations.length} variasi. Lanjutkan?`)) return;

    setSaving(true);
    let createdCount = 0;
    let errorsCount = 0;

    const promises = combinations.map(combo => {
      const name = combo.join(', ');
      const exists = variants.some(v => v.name.toLowerCase() === name.toLowerCase());
      if (exists) return Promise.resolve();

      const suffix = combo.map(c => c.toUpperCase().replace(/[^A-Z0-9]/g, '')).join('-');
      const parentSku = p.sku || p.name.toUpperCase().substring(0, 3);
      const generatedSku = `${parentSku}-${suffix}-${Math.floor(1000 + Math.random() * 9000)}`;

      const payload = {
        product_id: productId,
        name: name,
        sku: generatedSku,
        price: parseFloat(p.price) || 0,
        old_price: parseFloat(p.old_price) || 0,
        cogs: parseFloat(p.cogs) || 0,
        stock: 0,
        weight: parseInt(p.weight) || 0,
        length: parseInt(p.length) || 0,
        width: parseInt(p.width) || 0,
        height: parseInt(p.height) || 0,
        status: 'active',
        is_virtual: !!p.is_virtual,
        is_downloadable: !!p.is_downloadable,
        download_limit: p.download_limit === '' ? -1 : parseInt(p.download_limit),
        download_expiry: p.download_expiry === '' ? -1 : parseInt(p.download_expiry),
        downloadable_files: p.downloadable_files || '[]',
        commission_preset_id: p.commission_preset_id || null,
        tax_status: p.tax_status || 'taxable',
        tax_class: p.tax_class || 'standard',
        manage_stock: true,
      };

      return fetchJson(`${API}/products/variants/add`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }).then(resp => {
        createdCount++;
        return resp.data || resp;
      }).catch(_e => {
        errorsCount++;
        return null;
      });
    });

    Promise.all(promises).then(results => {
      const newCreated = results.filter(r => r !== null && r !== undefined);
      if (newCreated.length > 0) {
        setVariants(prev => [...prev, ...newCreated]);
      }
      setSaving(false);
      if (createdCount > 0) {
        toast.success(`Berhasil membuat ${createdCount} variasi baru.`);
      }
      if (errorsCount > 0) {
        toast.error(`Gagal membuat ${errorsCount} variasi.`);
      }
      if (createdCount === 0 && errorsCount === 0) {
        toast('Semua variasi kombinasi sudah ada.');
      }
    });
  };

  const handleBulkAction = () => {
    if (!bulkAction) return;
    if (variants.length === 0) {
      toast.error('Belum ada variasi untuk diproses.');
      return;
    }

    let val = '';
    if (bulkAction !== 'delete_all' && bulkAction !== 'toggle_virtual' && bulkAction !== 'toggle_downloadable') {
      val = prompt(`Masukkan nilai baru untuk aksi ini:`);
      if (val === null) return;
    }

    if (!window.confirm(`Apakah Anda yakin ingin melakukan aksi massal ini pada ${variants.length} variasi?`)) return;

    setSaving(true);
    const promises = variants.map(v => {
      let updated = { ...v };
      if (bulkAction === 'set_regular_price') updated.price = parseFloat(val) || 0;
      else if (bulkAction === 'set_sale_price') updated.old_price = parseFloat(val) || 0;
      else if (bulkAction === 'set_cogs') updated.cogs = parseFloat(val) || 0;
      else if (bulkAction === 'set_stock') updated.stock = parseInt(val) || 0;
      else if (bulkAction === 'set_weight') updated.weight = parseInt(val) || 0;
      else if (bulkAction === 'set_length') updated.length = parseInt(val) || 0;
      else if (bulkAction === 'set_width') updated.width = parseInt(val) || 0;
      else if (bulkAction === 'set_height') updated.height = parseInt(val) || 0;
      else if (bulkAction === 'toggle_virtual') updated.is_virtual = !v.is_virtual;
      else if (bulkAction === 'toggle_downloadable') updated.is_downloadable = !v.is_downloadable;
      else if (bulkAction === 'delete_all') {
        return fetchJson(`${API}/products/variants/delete?id=${v.id}`, { method: 'DELETE' })
          .then(() => ({ id: v.id, deleted: true }))
          .catch(() => ({ id: v.id, deleted: false }));
      }

      return fetchJson(`${API}/products/variants/update`, {
        method: 'PUT',
        body: JSON.stringify(updated),
      }).then(() => updated).catch(e => { console.error(e); return null; });
    });

    Promise.all(promises).then(results => {
      setSaving(false);
      if (bulkAction === 'delete_all') {
        const deletedIds = results.filter(r => r.deleted).map(r => r.id);
        setVariants(prev => prev.filter(v => !deletedIds.includes(v.id)));
        toast.success('Semua variasi berhasil dihapus.');
      } else {
        const updatedList = results.filter(r => r !== null);
        setVariants(prev => prev.map(v => {
          const match = updatedList.find(u => u.id === v.id);
          return match ? { ...v, ...match } : v;
        }));
        toast.success('Aksi massal berhasil diterapkan.');
      }
    });
  };

  // ─── TAB RENDERERS ─────────────────────────────────────────────────────────
  const renderPricingBlock = () => (
    <div style={{ background: '#f8fafc', borderRadius: 12, padding: 18, border: '1px solid #f1f5f9' }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>
        Penetapan Harga
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <label style={S.lbl}>Harga Normal (Rp) *</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6366f1', fontSize: 12, fontWeight: 800 }}>Rp</span>
            <input className="wc-inp" style={{ ...S.input, paddingLeft: 34, fontWeight: 800, color: '#4361ee', fontSize: 15 }}
              type="number" min="0" placeholder="0"
              value={p.price} onChange={e => set('price', e.target.value)} />
          </div>
        </div>
        <div>
          <label style={S.lbl}>Harga Sale / Coret (Rp)</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: 12, fontWeight: 700 }}>Rp</span>
            <input className="wc-inp" style={{ ...S.input, paddingLeft: 34 }}
              type="number" min="0" placeholder="Kosongkan jika tidak ada"
              value={p.old_price} onChange={e => set('old_price', e.target.value)} />
          </div>
        </div>
      </div>
    </div>
  );

  const renderGeneral = () => {
    const type = p.product_type;
    if (type === 'variable') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <InfoBanner icon="bx-copy-alt" color="#7c3aed" bg="#f5f3ff" border="#ddd6fe">
          <strong>Produk Variabel:</strong> Harga dan stok diatur per variasi di tab <strong>Variasi</strong>.
        </InfoBanner>
        <div>
          <label style={S.lbl}>Status Pajak</label>
          <AdminSelect className="wc-inp" style={S.select} value={p.tax_status} onChange={e => set('tax_status', e.target.value)}>
            <option value="taxable">Kena Pajak (Taxable)</option>
            <option value="reduced">Pajak Dikurangi (Reduced Rate)</option>
            <option value="none">Bebas Pajak (Zero Rate)</option>
          </AdminSelect>
        </div>
      </div>
    );
    if (type === 'grouped') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <InfoBanner icon="bx-group" color="#0369a1" bg="#f0f9ff" border="#bae6fd">
          <strong>Produk Bundel:</strong> Tambahkan produk anak di tab <strong>Produk Terkait</strong>.
        </InfoBanner>
        <div>
          <label style={S.lbl}>Status Pajak</label>
          <AdminSelect className="wc-inp" style={S.select} value={p.tax_status} onChange={e => set('tax_status', e.target.value)}>
            <option value="taxable">Kena Pajak (Taxable)</option>
            <option value="reduced">Pajak Dikurangi (Reduced Rate)</option>
            <option value="none">Bebas Pajak (Zero Rate)</option>
          </AdminSelect>
        </div>
      </div>
    );
    if (type === 'external') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <InfoBanner icon="bx-link-external" color="#0284c7" bg="#f0f9ff" border="#bae6fd">
          <strong>Produk Eksternal:</strong> Pembeli akan diarahkan ke URL eksternal saat menekan tombol beli.
        </InfoBanner>
        <div>
          <label style={S.lbl}>URL Produk <span style={{ color: '#ef4444' }}>*</span></label>
          <input className="wc-inp" style={S.input} type="url"
            placeholder="https://tokopedia.com/produk-anda"
            value={p.product_url} onChange={e => set('product_url', e.target.value)} />
        </div>
        <div>
          <label style={S.lbl}>Teks Tombol Beli</label>
          <input className="wc-inp" style={S.input} type="text"
            value={p.button_text} onChange={e => set('button_text', e.target.value)} />
        </div>
        {renderPricingBlock()}
        <div>
          <label style={S.lbl}>Status Pajak</label>
          <AdminSelect className="wc-inp" style={S.select} value={p.tax_status} onChange={e => set('tax_status', e.target.value)}>
            <option value="taxable">Kena Pajak (Taxable)</option>
            <option value="reduced">Pajak Dikurangi (Reduced Rate)</option>
            <option value="none">Bebas Pajak (Zero Rate)</option>
          </AdminSelect>
        </div>
      </div>
    );
    // simple & digital
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {type === 'digital' && (
          <InfoBanner icon="bx-cloud-download" color="#0284c7" bg="#f0f9ff" border="#bae6fd">
            <strong>Produk Digital:</strong> Tidak ada pengiriman fisik. Tab Pengiriman disembunyikan otomatis.
          </InfoBanner>
        )}
        {renderPricingBlock()}
        <div>
          <label style={S.lbl}>Modal / COGS (Rp) <span style={{ color: '#94a3b8', fontWeight: 400 }}>— Internal, tidak tampil ke pembeli</span></label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#ef4444', fontSize: 12, fontWeight: 800 }}>Rp</span>
            <input className="wc-inp" style={{ ...S.input, paddingLeft: 34, borderColor: '#fecaca', color: '#dc2626' }}
              type="number" min="0" placeholder="0"
              value={p.cogs} onChange={e => set('cogs', e.target.value)} />
          </div>
          {p.price && p.cogs && parseFloat(p.price) > 0 && (
            <div style={{ marginTop: 8, padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', fontSize: 12, color: '#166534', fontWeight: 700, display: 'flex', gap: 16 }}>
              <span>Profit: Rp {(parseFloat(p.price) - parseFloat(p.cogs)).toLocaleString('id-ID')}</span>
              <span>Margin: {(((parseFloat(p.price) - parseFloat(p.cogs)) / parseFloat(p.price)) * 100).toFixed(1)}%</span>
            </div>
          )}
        </div>
        <div>
          <label style={S.lbl}>Status Pajak</label>
          <AdminSelect className="wc-inp" style={S.select} value={p.tax_status} onChange={e => set('tax_status', e.target.value)}>
            <option value="taxable">Kena Pajak (Taxable)</option>
            <option value="reduced">Pajak Dikurangi (Reduced Rate)</option>
            <option value="none">Bebas Pajak (Zero Rate)</option>
          </AdminSelect>
        </div>

        {((p.is_downloadable || p.product_type === 'digital')) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, borderTop: '1px solid #e2e8f0', paddingTop: 20, marginTop: 4 }}>
            <div>
              <label style={{ ...S.lbl, display: 'flex', alignItems: 'center', gap: 6 }}>
                File yang dapat diunduh (Downloadable files)
                <span style={{ cursor: 'help', color: '#94a3b8' }} title="Pilih berkas dari Pustaka Media atau masukkan URL berkas eksternal."><i className="bx bx-help-circle"/></span>
              </label>
              
              <div style={{ border: '1px solid #cbd5e1', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                      <th style={{ width: 40, padding: '8px 12px' }}></th>
                      <th style={{ padding: '8px 12px', fontWeight: 700, color: '#334155' }}>Nama</th>
                      <th style={{ padding: '8px 12px', fontWeight: 700, color: '#334155' }}>File URL</th>
                      <th style={{ width: 120, padding: '8px 12px' }}></th>
                      <th style={{ width: 45, padding: '8px 12px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {downloadableFiles.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
                          Belum ada file. Klik tombol di bawah untuk menambah file baru.
                        </td>
                      </tr>
                    ) : (
                      downloadableFiles.map((file, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #cbd5e1', background: '#fff' }}>
                          <td style={{ padding: '10px 12px', textAlign: 'center', color: '#94a3b8', cursor: 'move' }}>
                            <i className="bx bx-menu" style={{ fontSize: 18, verticalAlign: 'middle' }} />
                          </td>
                          <td style={{ padding: '6px 12px' }}>
                            <input className="wc-inp" style={{ ...S.input, padding: '6px 10px', fontSize: 13 }}
                              type="text" placeholder="Nama file"
                              value={file.name}
                              onChange={e => {
                                const updated = [...downloadableFiles];
                                updated[idx].name = e.target.value;
                                setDownloadableFiles(updated);
                              }}
                            />
                          </td>
                          <td style={{ padding: '6px 12px' }}>
                            <input className="wc-inp" style={{ ...S.input, padding: '6px 10px', fontSize: 13 }}
                              type="text" placeholder="https://"
                              value={file.file_url}
                              onChange={e => {
                                const updated = [...downloadableFiles];
                                updated[idx].file_url = e.target.value;
                                setDownloadableFiles(updated);
                              }}
                            />
                          </td>
                          <td style={{ padding: '6px 12px' }}>
                            <button type="button"
                              style={{ width: '100%', padding: '6px 10px', fontSize: 12, fontWeight: 700, background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6, color: '#334155', cursor: 'pointer', transition: '0.15s' }}
                              onClick={() => {
                                setMediaType(`download_file_${idx}`);
                                setMediaOpen(true);
                              }}>
                              Choose file
                            </button>
                          </td>
                          <td style={{ padding: '6px 12px', textAlign: 'center' }}>
                            <button type="button"
                              style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', padding: 4 }}
                              onClick={() => {
                                setDownloadableFiles(prev => prev.filter((_, i) => i !== idx));
                              }}>
                              <i className="bx bx-trash" style={{ fontSize: 18 }} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <button type="button"
                style={{ marginTop: 8, padding: '6px 14px', fontSize: 12.5, fontWeight: 700, background: '#2271b1', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                onClick={() => setDownloadableFiles(prev => [...prev, { name: '', file_url: '' }])}>
                Add File
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={S.lbl}>Download limit (Batas unduhan)</label>
                <input className="wc-inp" style={S.input} type="number" min="0" placeholder="Unlimited (Tak terbatas)"
                  value={p.download_limit} onChange={e => set('download_limit', e.target.value)} />
                <div style={S.hint}>Biarkan kosong untuk unduhan tak terbatas.</div>
              </div>
              <div>
                <label style={S.lbl}>Download expiry (Kedaluwarsa unduhan)</label>
                <input className="wc-inp" style={S.input} type="number" min="0" placeholder="Never (Tak pernah)"
                  value={p.download_expiry} onChange={e => set('download_expiry', e.target.value)} />
                <div style={S.hint}>Masukkan jumlah hari sebelum tautan unduhan kedaluwarsa, atau biarkan kosong.</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderInventory = () => {
    const type = p.product_type;
    if (type === 'grouped') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <InfoBanner icon="bx-info-circle" color="#0369a1" bg="#f0f9ff" border="#bae6fd">
          Produk bundel tidak mengelola stok secara langsung.
        </InfoBanner>
        <div>
          <label style={S.lbl}>SKU (Stock Keeping Unit)</label>
          <input className="wc-inp" style={S.input} type="text" placeholder="Contoh: BDL-PAKET-001"
            value={p.sku} onChange={e => set('sku', e.target.value)} />
        </div>
      </div>
    );
    if (type === 'variable') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <InfoBanner icon="bx-copy-alt" color="#7c3aed" bg="#f5f3ff" border="#ddd6fe">
          Produk variabel mengelola stok <strong>per variasi</strong>. Atur stok di tab <strong>Variasi</strong>.
        </InfoBanner>
        <div>
          <label style={S.lbl}>SKU Produk Induk</label>
          <input className="wc-inp" style={S.input} type="text"
            value={p.sku} onChange={e => set('sku', e.target.value)} />
        </div>
        <div>
          <label style={S.lbl}>Status Stok Default</label>
          <AdminSelect className="wc-inp" style={S.select} value={p.stock > 0 ? 'instock' : 'outofstock'}
            onChange={e => set('stock', e.target.value === 'instock' ? 100 : 0)}>
            <option value="instock">Tersedia (In Stock)</option>
            <option value="outofstock">Habis (Out of Stock)</option>
          </AdminSelect>
        </div>
      </div>
    );
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <label style={S.lbl}>SKU (Stock Keeping Unit)</label>
          <input className="wc-inp" style={S.input} type="text" placeholder="Contoh: KAO-MERAH-XL-001"
            value={p.sku} onChange={e => set('sku', e.target.value)} />
          <div style={S.hint}>Kode unik produk. Kosongkan untuk auto-generate.</div>
        </div>
        <Toggle checked={!!p.manage_stock} onChange={v => set('manage_stock', v)}
          label="Kelola Stok (Manage Stock)"
          desc="Aktifkan tracking stok otomatis — berkurang setiap ada pesanan" />
        {p.manage_stock ? (
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: 18, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={S.lbl}>Jumlah Stok</label>
                <input className="wc-inp" style={{ ...S.input, fontWeight: 800, fontSize: 15 }} type="number" min="0"
                  value={p.stock} onChange={e => set('stock', e.target.value)} />
              </div>
              <div>
                <label style={S.lbl}>Ambang Batas Stok Rendah</label>
                <input className="wc-inp" style={S.input} type="number" min="0"
                  value={p.low_stock_threshold} onChange={e => set('low_stock_threshold', e.target.value)} />
                <div style={S.hint}>Notif saat stok ≤ nilai ini</div>
              </div>
            </div>
            <div>
              <label style={S.lbl}>Backorder / Pre-order</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                {[
                  { value: 'no',     label: 'Tidak Diizinkan', color: '#ef4444' },
                  { value: 'yes',    label: 'Izinkan',          color: '#10b981' },
                  { value: 'notify', label: 'Izinkan + Notif',  color: '#f59e0b' },
                ].map(opt => (
                  <button key={opt.value} type="button" onClick={() => set('backorders', opt.value)}
                    style={{
                      padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 12.5, fontWeight: 700,
                      display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s',
                      border: `1.5px solid ${p.backorders === opt.value ? opt.color : '#e2e8f0'}`,
                      background: p.backorders === opt.value ? `${opt.color}15` : '#fff',
                      color: p.backorders === opt.value ? opt.color : '#64748b',
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <Toggle checked={!!p.sold_individually} onChange={v => set('sold_individually', v)}
              label="Jual Satuan Saja (Sold Individually)"
              desc="Pembeli hanya bisa beli 1 produk ini per transaksi" />
          </div>
        ) : (
          <div style={{ padding: '12px 14px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0', fontSize: 12.5, color: '#166534', fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center' }}>
            <i className="bx bx-infinite" style={{ fontSize: 18 }} />
            Stok tidak dibatasi — pembeli bisa beli berapa saja
          </div>
        )}
        <div style={{ padding: '11px 14px', background: parseInt(p.stock) > 0 || !p.manage_stock ? '#f0fdf4' : '#fef2f2', borderRadius: 10, border: `1px solid ${parseInt(p.stock) > 0 || !p.manage_stock ? '#bbf7d0' : '#fecaca'}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: parseInt(p.stock) > 0 || !p.manage_stock ? '#22c55e' : '#ef4444', display: 'inline-block', flexShrink: 0 }} />
          <div style={{ fontSize: 12.5, fontWeight: 700, color: parseInt(p.stock) > 0 || !p.manage_stock ? '#166534' : '#991b1b' }}>
            Status Stok: {!p.manage_stock ? 'Tersedia (Unlimited)' : parseInt(p.stock) > 0 ? `Tersedia — ${p.stock} unit` : 'Habis (Out of Stock)'}
          </div>
        </div>
      </div>
    );
  };

  const renderShipping = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {p.product_type === 'variable' && (
        <InfoBanner icon="bx-info-circle" color="#7c3aed" bg="#f5f3ff" border="#ddd6fe">
          Dimensi ini adalah nilai <strong>default</strong>. Setiap variasi dapat memiliki berat berbeda.
        </InfoBanner>
      )}
      <div>
        <label style={S.lbl}>Berat Produk</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input className="wc-inp" style={{ ...S.input, maxWidth: 160 }} type="number" min="0" placeholder="500"
            value={p.weight} onChange={e => set('weight', e.target.value)} />
          <span style={{ fontSize: 13, color: '#64748b', fontWeight: 700 }}>gram</span>
        </div>
        <div style={S.hint}>Termasuk kemasan. Untuk kalkulasi ongkos kirim.</div>
      </div>
      <div>
        <label style={S.lbl}>Dimensi Produk</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {[{ k: 'length', l: 'Panjang', ph: '30' }, { k: 'width', l: 'Lebar', ph: '20' }, { k: 'height', l: 'Tinggi', ph: '10' }].map(d => (
            <div key={d.k}>
              <label style={{ ...S.lbl, fontSize: 11 }}>{d.l}</label>
              <div style={{ position: 'relative' }}>
                <input className="wc-inp" style={S.input} type="number" min="0" placeholder={d.ph}
                  value={p[d.k]} onChange={e => set(d.k, e.target.value)} />
                <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>cm</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderLinked = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Upsells */}
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
            Upsell
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12, lineHeight: 1.5 }}>
            Produk yang direkomendasikan di halaman produk ini sebagai pilihan yang lebih premium/mahal. Tampil di bagian "Produk yang Mungkin Kamu Suka".
          </div>
          <ProductSearchInput
            items={p.upsells || []}
            onAdd={item => set('upsells', [...(p.upsells || []), item])}
            onRemove={idx => set('upsells', (p.upsells || []).filter((_, i) => i !== idx))}
            label="Cari Produk untuk Upsell"
            placeholder="Ketik nama produk..."
            excludeLabel="Belum ada produk upsell ditambahkan."
          />
        </div>

        {/* Cross-sells */}
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
            Cross-sell
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12, lineHeight: 1.5 }}>
            Produk pelengkap yang direkomendasikan di halaman keranjang belanja (cart). Contoh: jual tas → cross-sell tali tas.
          </div>
          <ProductSearchInput
            items={p.crosssells || []}
            onAdd={item => set('crosssells', [...(p.crosssells || []), item])}
            onRemove={idx => set('crosssells', (p.crosssells || []).filter((_, i) => i !== idx))}
            label="Cari Produk untuk Cross-sell"
            placeholder="Ketik nama produk..."
            excludeLabel="Belum ada produk cross-sell ditambahkan."
          />
        </div>
      </div>
    );
  };

  const renderAttributes = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {p.product_type === 'variable' && (
        <InfoBanner icon="bx-copy-alt" color="#7c3aed" bg="#f5f3ff" border="#ddd6fe">
          <strong>Mode Variabel:</strong> Centang atribut yang akan digunakan untuk membuat variasi produk.
        </InfoBanner>
      )}
      {attrs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', background: '#f8fafc', borderRadius: 16, border: '2px dashed #e2e8f0' }}>
          <i className="bx bx-list-check" style={{ fontSize: 42, color: '#cbd5e1', display: 'block', marginBottom: 12 }} />
          <div style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Belum ada master atribut</div>
          <Link to="/admin/attributes" style={{ padding: '9px 22px', background: '#6366f1', color: '#fff', borderRadius: 10, textDecoration: 'none', fontSize: 12.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <i className="bx bx-plus" /> Buat Atribut Sekarang
          </Link>
        </div>
      ) : (
        attrs.map(a => {
          const vals    = (a.values || '').split(',').map(v => v.trim()).filter(Boolean);
          const checked = Array.isArray(selAttrs[a.name]) ? selAttrs[a.name] : [];
          return (
            <div key={a.id} style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '11px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="bx bx-tag" style={{ color: '#6366f1', fontSize: 15 }} />
                <span style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>{a.name}</span>
              </div>
              <div style={{ padding: '14px 16px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {vals.map((val, idx) => {
                  const isSel = checked.includes(val);
                  return (
                    <label key={idx} style={{
                      display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 20,
                      cursor: 'pointer', fontSize: 12.5, fontWeight: 600, transition: 'all 0.15s',
                      border: `1.5px solid ${isSel ? '#6366f1' : '#e2e8f0'}`,
                      background: isSel ? '#eef2ff' : '#fff', color: isSel ? '#4f46e5' : '#64748b',
                    }}>
                      <input type="checkbox" checked={isSel} onChange={e => handleAttrChange(a.name, val, e.target.checked)} style={{ display: 'none' }} />
                      {isSel && <i className="bx bx-check" style={{ fontSize: 13 }} />}
                      {val}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  const renderVariations = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AdminSelect className="wc-inp" style={{ ...S.select, width: 220, margin: 0, height: 36, padding: '0 10px', fontSize: 12.5 }}
            value={bulkAction} onChange={e => setBulkAction(e.target.value)}>
            <option value="">— Aksi Massal (Bulk Action) —</option>
            <option value="set_regular_price">Atur Harga Normal</option>
            <option value="set_sale_price">Atur Harga Sale</option>
            <option value="set_cogs">Atur Modal (COGS)</option>
            <option value="set_stock">Atur Jumlah Stok</option>
            <option value="set_weight">Atur Berat (gram)</option>
            <option value="set_length">Atur Panjang (cm)</option>
            <option value="set_width">Atur Lebar (cm)</option>
            <option value="set_height">Atur Tinggi (cm)</option>
            <option value="toggle_virtual">Toggle Virtual</option>
            <option value="toggle_downloadable">Toggle Downloadable</option>
            <option value="delete_all">Hapus Semua Variasi</option>
          </AdminSelect>
          <button type="button" onClick={handleBulkAction}
            style={{ padding: '8px 16px', background: '#475569', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 12.5, height: 36 }}>
            Terapkan
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={generateCartesianVariations}
            style={{ padding: '8px 16px', borderRadius: 10, border: '1.5px solid #7c3aed', background: '#f5f3ff', color: '#7c3aed', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, height: 36 }}>
            <i className="bx bx-git-merge" /> Buat Semua Kombinasi
          </button>
          <button type="button" onClick={() => {
            setNewVariant({
              name: '', sku: '', price: '', old_price: '', wholesale_price: '', cogs: '',
              stock: 0, weight: '', status: 'active', is_virtual: false, is_downloadable: false,
              download_limit: '', download_expiry: '', downloadable_files: '[]',
              description: '', sale_start: '', sale_end: '', tax_status: 'taxable', tax_class: 'standard',
              manage_stock: true, commission_preset_id: '', merchant_commission_preset_id: ''
            });
            setVariantFiles([]);
            setShowVariantModal(true);
          }}
            style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: '#4361ee', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, height: 36 }}>
            <i className="bx bx-plus" /> Tambah Manual
          </button>
        </div>
      </div>
      {variants.length > 0 ? (
        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 580 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1.5px solid #f1f5f9' }}>
                <th style={{ padding: '10px 8px', fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, paddingLeft: 0 }}>Varian</th>
                <th style={{ padding: '10px 8px', fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>SKU</th>
                <th style={{ padding: '10px 8px', fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Harga (Rp)</th>
                <th style={{ padding: '10px 8px', fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, textAlign: 'center' }}>Stok</th>
                <th style={{ padding: '10px 8px', fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}></th>
              </tr>
            </thead>
            <tbody>
              {variants.map(v => (
                <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 8px 14px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img src={v.image || '/placeholder-product.webp'} alt={v.name}
                      style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', background: '#f1f5f9' }}
                      onError={e => e.target.src = '/placeholder-product.webp'} />
                    <div>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 13 }}>{v.name}</div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                        {v.is_virtual && <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 800 }}>Virtual</span>}
                        {v.is_downloadable && <span style={{ background: '#fdf2f8', color: '#be185d', padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 800 }}>Downloadable</span>}
                        {v.status === 'inactive' && <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 800 }}>Nonaktif</span>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 8px', color: '#64748b', fontSize: 12 }}>{v.sku}</td>
                  <td style={{ padding: '14px 8px', fontSize: 13 }}>
                    <div style={{ fontWeight: 800, color: '#4361ee' }}>
                      Rp {(v.price || 0).toLocaleString('id-ID')}
                    </div>
                    {(v.old_price || 0) > 0 && (
                      <div style={{ fontSize: 11, color: '#94a3b8', textDecoration: 'line-through' }}>
                        Rp {v.old_price.toLocaleString('id-ID')}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '14px 8px', textAlign: 'center' }}>
                    {v.manage_stock ? (
                      <span style={{ background: v.stock > 0 ? '#dcfce7' : '#fee2e2', color: v.stock > 0 ? '#166534' : '#991b1b', padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 800 }}>
                        {v.stock} unit
                      </span>
                    ) : (
                      <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 800 }}>
                        &infin; Stok
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button onClick={() => {
                        setEditingVariant(v);
                        try {
                          setVariantFiles(JSON.parse(v.downloadable_files || '[]'));
                        } catch (_e) {
                          setVariantFiles([]);
                        }
                      }}
                        style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: '#f1f5f9', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="bx bx-edit-alt" style={{ fontSize: 14 }} />
                      </button>
                      <button onClick={() => handleDeleteVariant(v.id)}
                        style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: '#fee2e2', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="bx bx-trash" style={{ fontSize: 14 }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: 16, border: '2px dashed #e2e8f0' }}>
          <i className="bx bx-package" style={{ fontSize: 40, color: '#cbd5e1', marginBottom: 12, display: 'block' }} />
          <p style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, margin: 0 }}>Belum ada varian. Gunakan varian jika produk memiliki harga/stok berbeda.</p>
        </div>
      )}
    </div>
  );

  const renderAdvanced = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <label style={S.lbl}>Catatan Pembelian (Purchase Note)</label>
        <textarea className="wc-inp" style={{ ...S.input, minHeight: 90, resize: 'vertical', lineHeight: 1.65 }}
          placeholder="Pesan yang otomatis terkirim ke pembeli setelah transaksi berhasil..."
          value={p.purchase_note} onChange={e => set('purchase_note', e.target.value)} />
        <div style={S.hint}>Contoh: "Terima kasih! Pesanan akan dikemas dalam 1×24 jam kerja."</div>
      </div>
      <div>
        <label style={S.lbl}>Urutan Menu (Menu Order)</label>
        <input className="wc-inp" style={{ ...S.input, maxWidth: 120 }} type="number" min="0"
          value={p.menu_order} onChange={e => set('menu_order', parseInt(e.target.value) || 0)} />
        <div style={S.hint}>Nilai lebih kecil = tampil lebih awal. Default: 0</div>
      </div>
      <Toggle checked={!!p.enable_reviews} onChange={v => set('enable_reviews', v)}
        label="Aktifkan Review & Rating"
        desc="Pembeli yang sudah transaksi dapat memberi bintang dan ulasan" />
    </div>
  );

  const renderSEO = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Pratinjau Google Search
        </div>
        <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', fontFamily: 'Arial, sans-serif' }}>
          <div style={{ fontSize: 14, color: '#1a0dab', fontWeight: 600, marginBottom: 3 }}>
            {p.seo_title || p.name || '— Judul Produk Anda —'}
          </div>
          <div style={{ fontSize: 11.5, color: '#006621', marginBottom: 4 }}>
            {getSiteUrl()}/product/{p.slug || 'slug-produk-anda'}
          </div>
          <div style={{ fontSize: 12.5, color: '#545454', lineHeight: 1.5 }}>
            {p.meta_description || p.short_description || 'Meta deskripsi Anda akan muncul di sini...'}
          </div>
        </div>
      </div>
      <div>
        <label style={S.lbl}>SEO Title</label>
        <input className="wc-inp" style={S.input} type="text" placeholder={p.name || 'Judul untuk mesin pencari...'}
          value={p.seo_title} onChange={e => set('seo_title', e.target.value)} />
        <SeoMeter value={(p.seo_title || '').length} max={60} warningAt={30} label="Ideal: 30–60 karakter" />
      </div>
      <div>
        <label style={S.lbl}>Meta Deskripsi</label>
        <textarea className="wc-inp" style={{ ...S.input, minHeight: 80, resize: 'vertical' }}
          placeholder="Deskripsi menarik untuk ditampilkan di hasil pencarian Google..."
          value={p.meta_description} onChange={e => set('meta_description', e.target.value)} />
        <SeoMeter value={(p.meta_description || '').length} max={160} warningAt={80} label="Ideal: 80–160 karakter" />
      </div>
      <div>
        <label style={S.lbl}>Kata Kunci Fokus</label>
        <input className="wc-inp" style={S.input} type="text" placeholder="Contoh: kaos polos pria premium"
          value={p.focus_keyword} onChange={e => set('focus_keyword', e.target.value)} />
      </div>
      <div>
        <label style={S.lbl}>Slug / Permalink URL</label>
        <div style={{ display: 'flex', alignItems: 'stretch', border: '1.5px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
          <span style={{ padding: '10px 14px', background: '#f8fafc', fontSize: 12, color: '#94a3b8', fontWeight: 600, borderRight: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', flexShrink: 0 }}>
            /product/
          </span>
          <input className="wc-inp" style={{ flex: 1, border: 'none', outline: 'none', padding: '10px 14px', fontSize: 13, color: '#334155', fontFamily: "'Inter', sans-serif", background: 'transparent' }}
            type="text" placeholder="slug-produk"
            value={p.slug} onChange={e => { setSlugManual(true); set('slug', e.target.value); }} />
        </div>
      </div>
    </div>
  );

  const renderKomisi = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <InfoBanner icon="bx-info-circle" color="#0369a1" bg="#f0f9ff" border="#bae6fd">
        Preset komisi menentukan bagaimana keuntungan penjualan produk ini didistribusikan ke jaringan afiliasi secara berjenjang.
      </InfoBanner>
      <div>
        <label style={S.lbl}>Preset Komisi Afiliasi</label>
        <AdminSelect className="wc-inp" style={S.select}
          value={p.commission_preset_id || ''}
          onChange={e => set('commission_preset_id', e.target.value || null)}>
          <option value="">— Gunakan Hierarki Default —</option>
          {presets.map(pr => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
        </AdminSelect>
        <div style={S.hint}>Distribusi komisi ke upline mitra secara berjenjang.</div>
      </div>
      {/* Tier Commission Matrix */}
      <div style={{ background: '#f8fafc', borderRadius: 12, padding: 18, border: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>
          Matriks Komisi per Tier
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', fontSize: 10, color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>Jenjang</th>
              <th style={{ textAlign: 'center', fontSize: 10, color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>Default</th>
              <th style={{ textAlign: 'right', fontSize: 10, color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>Rate Khusus (%)</th>
            </tr>
          </thead>
          <tbody>
            {tiers.sort((a, b) => a.level - b.level).map(tier => {
              const custom = tierComms.find(x => x.membership_tier_id === tier.id);
              const currentRate = custom ? (custom.commission_rate * 100).toFixed(1) : '';
              return (
                <tr key={tier.id}>
                  <td style={{ padding: '12px 0', borderBottom: '1px solid #f8fafc' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 800, color: '#1e293b' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: tier.color, display: 'inline-block' }} />
                      {tier.name}
                    </div>
                  </td>
                  <td style={{ padding: '12px 0', textAlign: 'center', color: '#94a3b8', fontSize: 12, borderBottom: '1px solid #f8fafc' }}>
                    {(tier.base_commission_rate * 100).toFixed(1)}%
                  </td>
                  <td style={{ padding: '12px 0', textAlign: 'right', borderBottom: '1px solid #f8fafc' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                      <input type="number" step="0.1" placeholder="Auto"
                        defaultValue={currentRate}
                        onBlur={(e) => { if (e.target.value !== currentRate) handleTierCommUpdate(tier.id, e.target.value); }}
                        disabled={updatingTier === tier.id}
                        style={{ width: 75, padding: '6px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', textAlign: 'right', fontSize: 13, fontWeight: 800, outline: 'none', color: '#4361ee' }} />
                      {updatingTier === tier.id && <i className="bx bx-loader-alt bx-spin" style={{ color: '#6366f1' }} />}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':    return renderGeneral();
      case 'inventory':  return renderInventory();
      case 'shipping':   return renderShipping();
      case 'linked':     return renderLinked();
      case 'attributes': return renderAttributes();
      case 'variations': return renderVariations();
      case 'advanced':   return renderAdvanced();
      case 'seo':        return renderSEO();
      case 'komisi':     return renderKomisi();
      default:           return null;
    }
  };

  // ─── Loading / Error states ────────────────────────────────────────────────
  if (loading) return (
    <div style={{ padding: 100, textAlign: 'center' }}>
      <div style={{ width: 40, height: 40, border: '4px solid #f3f3f3', borderTop: '4px solid #6366f1', borderRadius: '50%', margin: '0 auto', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ marginTop: 16, color: '#94a3b8', fontSize: 13 }}>Memuat data produk...</p>
    </div>
  );
  if (error || !p.id) return (
    <div style={{ padding: 100, textAlign: 'center' }}>
      <i className="bx bx-error-circle" style={{ fontSize: 64, color: '#ef4444', marginBottom: 16 }} />
      <h2 style={{ fontWeight: 800, color: '#0f172a' }}>Gagal Memuat Produk</h2>
      <p style={{ color: '#64748b', marginBottom: 24 }}>{error || 'ID produk tidak valid atau sudah dihapus.'}</p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <Link to="/admin/products" style={{ padding: '10px 20px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>Kembali</Link>
        <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', borderRadius: 12, border: 'none', background: '#6366f1', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Coba Lagi</button>
      </div>
    </div>
  );

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '0 2px 60px', maxWidth: 1380, margin: '0 auto' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        .wc-page, .wc-page * { font-family: 'Inter', -apple-system, sans-serif; box-sizing: border-box; }
        .wc-inp:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.1) !important; }
        .wc-tab-btn:hover:not(.wc-tab-active) { background: #f1f5f9 !important; color: #475569 !important; }
        @keyframes wcSlide { from { opacity:0; transform:translateX(8px); } to { opacity:1; transform:none; } }
        @keyframes wcFade  { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        @keyframes spin    { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .wc-fade  { animation: wcFade  0.3s ease; }
        .wc-slide { animation: wcSlide 0.2s ease; }
        @media (max-width: 1100px) { .wc-layout { flex-direction: column !important; } .wc-sidebar { width: 100% !important; } }
        input[type=number]::-webkit-inner-spin-button { opacity: 0.4; }
        .ep-modal-overlay { position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(15,23,42,0.7); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; z-index:1000; }
        .ep-modal { background:#fff; width:680px; max-height:90vh; overflow-y:auto; max-width:95%; border-radius:20px; padding:28px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25); }
        .ep-modal-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:20px; }
      `}</style>

      {/* Header */}
      <div className="wc-fade" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 0 22px', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link to="/admin/products" style={{ width: 40, height: 40, borderRadius: 11, border: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', textDecoration: 'none', background: '#fff', fontSize: 20 }}>
            <i className="bx bx-arrow-back" />
          </Link>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 3 }}>
              <Link to="/admin" style={{ color: '#94a3b8', textDecoration: 'none' }}>Admin</Link>{' / '}
              <Link to="/admin/products" style={{ color: '#94a3b8', textDecoration: 'none' }}>Produk</Link>{' / Ubah SKU'}
            </div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>
              Ubah: {p.name}
            </h1>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={() => handleSubmit('taken_down')} disabled={saving}
            style={{ padding: '10px 20px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Simpan Draft
          </button>
          <button type="button" onClick={() => handleSubmit('active')} disabled={saving}
            style={{ padding: '10px 26px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}>
            {saving ? <i className="bx bx-loader-alt bx-spin" /> : <i className="bx bx-check-circle" />}
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>

      {/* 2-Column Layout */}
      <div className="wc-layout" style={{ display: 'flex', gap: 22, alignItems: 'flex-start' }}>

        {/* LEFT */}
        <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* 1) Product Name */}
          <div className="wc-fade" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '18px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <input className="wc-inp"
              style={{ ...S.input, fontSize: 22, fontWeight: 700, padding: '8px 0', border: 'none', borderBottom: '2px solid #e2e8f0', borderRadius: 0, color: '#0f172a', letterSpacing: '-0.02em' }}
              type="text"
              placeholder="Nama produk"
              value={p.name}
              onChange={e => set('name', e.target.value)}
            />
            {p.name && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 11.5, color: '#94a3b8' }}>
                <i className="bx bx-link-alt" style={{ fontSize: 13 }} />
                <span>Permalink:</span>
                <a href="#" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>
                  /produk/<span style={{ color: '#0f172a' }}>{p.slug || '—'}</span>
                </a>
                <button type="button" onClick={() => setSlugManual(!slugManual)}
                  style={{ fontSize: 11, color: '#6366f1', background: 'none', border: '1px solid #e2e8f0', borderRadius: 5, padding: '1px 7px', cursor: 'pointer', fontWeight: 700 }}>
                  {slugManual ? 'Auto' : 'Edit'}
                </button>
                {slugManual && (
                  <input className="wc-inp" style={{ ...S.input, fontSize: 12, padding: '3px 8px', maxWidth: 220, height: 26, borderRadius: 6 }}
                    value={p.slug} onChange={e => set('slug', e.target.value)} />
                )}
              </div>
            )}
          </div>

          {/* 2) Product Data (WooCommerce-style metabox) */}
          <div className="wc-fade" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid #e2e8f0', background: '#f6f7f7', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1d2327' }}>Data Produk —</span>
              <AdminSelect className="wc-inp"
                style={{ padding: '4px 28px 4px 10px', borderRadius: 4, border: '1px solid #8c8f94', fontSize: 13, fontWeight: 600, color: '#1d2327', background: '#fff', cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 9px center' }}
                value={p.product_type}
                onChange={e => {
                  const val = e.target.value;
                  setP(prev => {
                    const next = { ...prev, product_type: val };
                    if (val === 'digital') {
                      next.is_virtual = true;
                      next.is_downloadable = true;
                    } else {
                      next.is_virtual = false;
                      next.is_downloadable = false;
                    }
                    return next;
                  });
                }}>
                {PRODUCT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </AdminSelect>
            </div>

            {/* Vertical tabs + content */}
            <div style={{ display: 'flex', minHeight: 360 }}>
              <ul style={{ width: 160, borderRight: '1px solid #e2e8f0', background: '#f6f7f7', flexShrink: 0, padding: 0, margin: 0, listStyle: 'none' }}>
                {visibleTabs.map(tab => {
                  const isActive = activeTab === tab.id;
                  return (
                    <li key={tab.id}>
                      <button type="button"
                        className={`wc-tab-btn${isActive ? ' wc-tab-active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                          width: '100%', padding: '12px 14px', border: 'none', borderRadius: 0,
                          background: isActive ? '#fff' : 'transparent',
                          borderLeft: `3px solid ${isActive ? '#2271b1' : 'transparent'}`,
                          color: isActive ? '#2271b1' : '#50575e',
                          fontSize: 13, fontWeight: isActive ? 700 : 500,
                          textAlign: 'left', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 8,
                          transition: 'all 0.15s',
                        }}>
                        <i className={`bx ${tab.icon}`} style={{ fontSize: 15, flexShrink: 0, color: isActive ? '#2271b1' : '#72777c' }} />
                        <span>{tab.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div key={`${p.product_type}-${activeTab}`} className="wc-slide"
                style={{ flex: 1, padding: 22, minWidth: 0, overflowX: 'hidden' }}>
                {renderTabContent()}
              </div>
            </div>
          </div>

          {/* 3) Long Description */}
          <div className="wc-fade" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '11px 18px', borderBottom: '1px solid #e2e8f0', background: '#f6f7f7', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1d2327' }}>Deskripsi Produk</span>
              <span style={{ fontSize: 11.5, color: '#72777c', fontWeight: 400 }}>(tampil di halaman produk)</span>
            </div>
            <div style={{ padding: 18 }}>
              <JoditEditor
                value={p.description}
                config={{ placeholder: 'Jelaskan produk secara detail...', minHeight: 240 }}
                onBlur={newContent => set('description', newContent)}
              />
            </div>
          </div>

          {/* 4) Short Description */}
          <div className="wc-fade" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '11px 18px', borderBottom: '1px solid #e2e8f0', background: '#f6f7f7', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1d2327' }}>Deskripsi Singkat Produk</span>
              <span style={{ fontSize: 11.5, color: '#72777c', fontWeight: 400 }}>(tampil di listing & atas tombol Beli)</span>
            </div>
            <div style={{ padding: 18 }}>
              <JoditEditor
                value={p.short_description}
                config={{ placeholder: 'Ringkasan menarik produk — ideal 1-2 kalimat...', minHeight: 100 }}
                onBlur={newContent => set('short_description', newContent)}
              />
            </div>
          </div>
        </div>

        {/* RIGHT Sidebar */}
        <div className="wc-sidebar" style={{ width: 288, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Publish */}
          <SideCard title="Publikasi" icon="bx-send">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600 }}>Status</span>
                <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 800, background: p.status === 'active' ? '#dcfce7' : '#f1f5f9', color: p.status === 'active' ? '#166534' : '#475569' }}>
                  {p.status === 'active' ? '● Aktif' : '○ Draft'}
                </span>
              </div>
              <div>
                <label style={{ ...S.lbl, fontSize: 12 }}>Visibilitas</label>
                <AdminSelect className="wc-inp" style={{ ...S.select, fontSize: 12.5 }} value={p.visibility} onChange={e => set('visibility', e.target.value)}>
                  <option value="public">Publik — Semua bisa lihat</option>
                  <option value="catalog">Katalog — Tidak di pencarian</option>
                  <option value="search">Pencarian — Tidak di listing</option>
                  <option value="hidden">Tersembunyi — Direct link saja</option>
                </AdminSelect>
              </div>
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button type="button" onClick={() => handleSubmit('active')} disabled={saving}
                  style={{ width: '100%', padding: '12px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}>
                  {saving ? <i className="bx bx-loader-alt bx-spin" /> : <i className="bx bx-save" />}
                  {saving ? 'Menyimpan...' : 'Simpan & Aktifkan'}
                </button>
                <button type="button" onClick={() => handleSubmit('taken_down')} disabled={saving}
                  style={{ width: '100%', padding: '9px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                  Simpan sebagai Draft
                </button>
              </div>
            </div>
          </SideCard>

          {/* Product Image */}
          <SideCard title="Foto Utama Produk" icon="bx-image">
            <div>
              {p.image ? (
                <div style={{ position: 'relative', marginBottom: 10 }}>
                  <img src={formatImage(p.image)} alt="main" style={{ width: '100%', height: 170, objectFit: 'cover', borderRadius: 10, border: '1.5px solid #e2e8f0' }} />
                  <button type="button" onClick={() => set('image', '')}
                    style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', background: 'rgba(239,68,68,0.9)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                    <i className="bx bx-x" />
                  </button>
                </div>
              ) : (
                <label style={{ display: 'flex', width: '100%', height: 130, borderRadius: 10, border: '2px dashed #cbd5e1', cursor: 'pointer', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: 10, transition: 'all 0.2s', color: '#94a3b8' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1'; e.currentTarget.style.background = '#fafafe'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent'; }}>
                  {uploading ? <i className="bx bx-loader-alt bx-spin" style={{ fontSize: 32 }} /> : <i className="bx bx-image-add" style={{ fontSize: 32 }} />}
                  <span style={{ fontSize: 12, fontWeight: 600, marginTop: 8 }}>Klik untuk upload</span>
                  <span style={{ fontSize: 10.5, marginTop: 2, color: '#cbd5e1' }}>JPG, PNG, WEBP · max 5MB</span>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleUpload(e, 'main')} />
                </label>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => { setMediaType('main'); setMediaOpen(true); }}
                  style={{ flex: 1, padding: '8px 10px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <i className="bx bx-images" /> Pustaka
                </button>
                <label style={{ flex: 1, padding: '8px 10px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', color: '#6366f1', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <i className="bx bx-upload" /> Upload
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleUpload(e, 'main')} />
                </label>
              </div>
            </div>
          </SideCard>

          {/* Gallery */}
          <SideCard title="Galeri Produk" icon="bx-photo-album">
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8 }}>
                {gallery.map((img, idx) => (
                  <div key={idx} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', border: '1.5px solid #e2e8f0' }}>
                    <img src={formatImage(img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" onClick={() => removeGallery(idx)}
                      style={{ position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: '50%', background: 'rgba(239,68,68,0.9)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
                      <i className="bx bx-x" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => { setMediaType('gallery'); setMediaOpen(true); }}
                  style={{ aspectRatio: '1', borderRadius: 8, border: '2px dashed #cbd5e1', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 24, transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#94a3b8'; }}>
                  <i className="bx bx-plus" />
                </button>
              </div>
              <div style={S.hint}>3–5 foto rekomendasi. Klik + untuk tambah.</div>
            </div>
          </SideCard>

          {/* Category & Tags */}
          <SideCard title="Kategori & Tag" icon="bx-category">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ ...S.lbl, fontSize: 12 }}>Kategori <span style={{ color: '#ef4444' }}>*</span></label>
                <AdminSelect className="wc-inp" style={{ ...S.select, fontSize: 12.5 }} value={p.category} onChange={e => set('category', e.target.value)}>
                  <option value="">— Pilih Kategori —</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </AdminSelect>
              </div>
              <div>
                <label style={{ ...S.lbl, fontSize: 12 }}>Tag Produk</label>
                <input className="wc-inp" style={{ ...S.input, fontSize: 13 }} type="text"
                  placeholder="premium, bestseller, new" value={p.tags || ''} onChange={e => set('tags', e.target.value)} />
                <div style={S.hint}>Pisahkan dengan koma</div>
              </div>
            </div>
          </SideCard>

          {/* Brand */}
          <SideCard title="Merek / Brand" icon="bx-store">
            <AdminSelect className="wc-inp" style={{ ...S.select, fontSize: 12.5 }} value={p.brand} onChange={e => set('brand', e.target.value)}>
              <option value="">— Tanpa Brand —</option>
              {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
            </AdminSelect>
          </SideCard>
        </div>
      </div>

      {/* Modal: Add Variant */}
      {showVariantModal && (
        <div className="ep-modal-overlay">
          <div className="ep-modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#1e293b' }}>Tambah Varian Baru</h3>
              <button onClick={() => setShowVariantModal(false)} style={{ background: 'none', border: 'none', fontSize: 22, color: '#94a3b8', cursor: 'pointer' }}>&times;</button>
            </div>

            {/* Checkboxes Row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 16, background: '#f8fafc', padding: 12, borderRadius: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', color: '#334155' }}>
                <input type="checkbox" checked={newVariant.status === 'active'}
                  onChange={e => setNewVariant({ ...newVariant, status: e.target.checked ? 'active' : 'inactive' })} />
                Aktif
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', color: '#334155' }}>
                <input type="checkbox" checked={!!newVariant.is_virtual}
                  onChange={e => setNewVariant({ ...newVariant, is_virtual: e.target.checked })} />
                Virtual
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', color: '#334155' }}>
                <input type="checkbox" checked={!!newVariant.is_downloadable}
                  onChange={e => setNewVariant({ ...newVariant, is_downloadable: e.target.checked })} />
                Downloadable
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', color: '#334155' }}>
                <input type="checkbox" checked={!!newVariant.manage_stock}
                  onChange={e => setNewVariant({ ...newVariant, manage_stock: e.target.checked })} />
                Kelola Stok
              </label>
            </div>

            <div className="ep-modal-grid">
              {/* Image Selector */}
              <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: 14, background: '#f8fafc', padding: 12, borderRadius: 12 }}>
                <img src={newVariant.image || '/placeholder-product.webp'} alt="Preview"
                  style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover', background: '#fff', border: '1.5px solid #e2e8f0' }}
                  onError={e => e.target.src = '/placeholder-product.webp'} />
                <div>
                  <button type="button" onClick={() => { setMediaType('variant_image_new'); setMediaOpen(true); }}
                    style={{ padding: '6px 12px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', marginBottom: 4 }}>
                    Pilih Gambar Varian
                  </button>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>Resolusi rekomendasi: 800x800px</div>
                </div>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={S.lbl}>Nama Varian (Misal: Merah, XL)</label>
                <input type="text" className="wc-inp" style={{ ...S.input, fontWeight: 800 }}
                  value={newVariant.name} onChange={e => setNewVariant({ ...newVariant, name: e.target.value })} placeholder="Nama Varian" />
              </div>

              <div>
                <label style={S.lbl}>SKU Varian</label>
                <input type="text" className="wc-inp" style={S.input}
                  value={newVariant.sku} onChange={e => setNewVariant({ ...newVariant, sku: e.target.value })} placeholder="SKU-VAR-1" />
              </div>

              <div>
                <label style={S.lbl}>Berat (Gram)</label>
                <input type="number" className="wc-inp" style={S.input}
                  value={newVariant.weight} onChange={e => setNewVariant({ ...newVariant, weight: e.target.value })} placeholder="0" />
              </div>

              <div>
                <label style={S.lbl}>Dimensi (P × L × T) (cm)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <input type="number" className="wc-inp" style={S.input} placeholder="P"
                    value={newVariant.length || ''} onChange={e => setNewVariant({ ...newVariant, length: e.target.value })} />
                  <input type="number" className="wc-inp" style={S.input} placeholder="L"
                    value={newVariant.width || ''} onChange={e => setNewVariant({ ...newVariant, width: e.target.value })} />
                  <input type="number" className="wc-inp" style={S.input} placeholder="T"
                    value={newVariant.height || ''} onChange={e => setNewVariant({ ...newVariant, height: e.target.value })} />
                </div>
              </div>

              <div>
                <label style={S.lbl}>Harga Jual Normal (Rp) *</label>
                <input type="number" className="wc-inp" style={{ ...S.input, fontWeight: 800, color: '#4361ee' }}
                  value={newVariant.price} onChange={e => setNewVariant({ ...newVariant, price: e.target.value })} placeholder="0" />
              </div>

              <div>
                <label style={S.lbl}>Harga Sale / Coret (Rp)</label>
                <input type="number" className="wc-inp" style={S.input}
                  value={newVariant.old_price} onChange={e => setNewVariant({ ...newVariant, old_price: e.target.value })} placeholder="Kosongkan jika tidak ada" />
              </div>

              <div>
                <label style={S.lbl}>Modal / COGS (Rp) *</label>
                <input type="number" className="wc-inp" style={{ ...S.input, color: '#dc2626' }}
                  value={newVariant.cogs} onChange={e => setNewVariant({ ...newVariant, cogs: e.target.value })} placeholder="0" />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                {newVariant.manage_stock && (
                  <div>
                    <label style={S.lbl}>Jumlah Stok Varian</label>
                    <input type="number" className="wc-inp" style={{ ...S.input, fontWeight: 800 }}
                      value={newVariant.stock} onChange={e => setNewVariant({ ...newVariant, stock: e.target.value })} />
                  </div>
                )}
              </div>

              <div>
                <label style={S.lbl}>Status Pajak</label>
                <AdminSelect className="wc-inp" style={S.select} value={newVariant.tax_status} onChange={e => setNewVariant({ ...newVariant, tax_status: e.target.value })}>
                  <option value="taxable">Kena Pajak (Taxable)</option>
                  <option value="reduced">Pajak Dikurangi (Reduced Rate)</option>
                  <option value="none">Bebas Pajak (Zero Rate)</option>
                </AdminSelect>
              </div>

              <div>
                <label style={S.lbl}>Kelas Pajak</label>
                <AdminSelect className="wc-inp" style={S.select} value={newVariant.tax_class} onChange={e => setNewVariant({ ...newVariant, tax_class: e.target.value })}>
                  <option value="standard">Standard</option>
                  <option value="reduced">Reduced Rate</option>
                  <option value="zero">Zero Rate</option>
                </AdminSelect>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={S.lbl}>Komisi Affiliate (Override)</label>
                <AdminSelect className="wc-inp" style={S.select} value={newVariant.commission_preset_id || ''} onChange={e => setNewVariant({ ...newVariant, commission_preset_id: e.target.value })}>
                  <option value="">Gunakan Default Produk</option>
                  {presets.map(ps => <option key={ps.id} value={ps.id}>{ps.name}</option>)}
                </AdminSelect>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={S.lbl}>Deskripsi Pendek Varian</label>
                <textarea className="wc-inp" style={{ ...S.input, minHeight: 60, resize: 'vertical' }}
                  value={newVariant.description} onChange={e => setNewVariant({ ...newVariant, description: e.target.value })} placeholder="Tulis deskripsi singkat varian ini..." />
              </div>

              {/* Downloadable Area */}
              {newVariant.is_downloadable && (
                <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 14, background: '#fff0f6', padding: 14, borderRadius: 12, border: '1px solid #fbcfe8' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ ...S.lbl, color: '#9d174d' }}>Berkas Unduhan Varian</label>
                    <button type="button" onClick={() => setVariantFiles([...variantFiles, { name: '', file_url: '' }])}
                      style={{ padding: '4px 10px', background: '#fce7f3', color: '#9d174d', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                      + Tambah Berkas
                    </button>
                  </div>
                  {variantFiles.map((file, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="text" className="wc-inp" style={{ ...S.input, flex: 1, margin: 0 }} placeholder="Nama Berkas (misal: Ebook PDF)"
                        value={file.name} onChange={e => setVariantFiles(variantFiles.map((f, i) => i === idx ? { ...f, name: e.target.value } : f))} />
                      <input type="text" className="wc-inp" style={{ ...S.input, flex: 2, margin: 0 }} placeholder="URL Berkas"
                        value={file.file_url} onChange={e => setVariantFiles(variantFiles.map((f, i) => i === idx ? { ...f, file_url: e.target.value } : f))} />
                      <button type="button" onClick={() => { setMediaType('variant_file_' + idx); setMediaOpen(true); }}
                        style={{ padding: '8px 12px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                        Pilih
                      </button>
                      <button type="button" onClick={() => setVariantFiles(variantFiles.filter((_, i) => i !== idx))}
                        style={{ padding: '8px', background: '#fecaca', color: '#991b1b', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <i className="bx bx-trash" />
                      </button>
                    </div>
                  ))}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ ...S.lbl, fontSize: 11, color: '#9d174d' }}>Batas Unduhan</label>
                      <input type="number" className="wc-inp" style={S.input} placeholder="Unlimited"
                        value={newVariant.download_limit} onChange={e => setNewVariant({ ...newVariant, download_limit: e.target.value })} />
                    </div>
                    <div>
                      <label style={{ ...S.lbl, fontSize: 11, color: '#9d174d' }}>Kedaluwarsa Unduhan (Hari)</label>
                      <input type="number" className="wc-inp" style={S.input} placeholder="Never"
                        value={newVariant.download_expiry} onChange={e => setNewVariant({ ...newVariant, download_expiry: e.target.value })} />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <button onClick={handleAddVariant} style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: '#4361ee', color: '#fff', fontSize: 13.5, fontWeight: 800, cursor: 'pointer' }}>
              Tambah Varian
            </button>
          </div>
        </div>
      )}

      {/* Modal: Edit Variant */}
      {editingVariant && (
        <div className="ep-modal-overlay">
          <div className="ep-modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#1e293b' }}>Edit Varian</h3>
              <button onClick={() => setEditingVariant(null)} style={{ background: 'none', border: 'none', fontSize: 22, color: '#94a3b8', cursor: 'pointer' }}>&times;</button>
            </div>

            {/* Checkboxes Row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 16, background: '#f8fafc', padding: 12, borderRadius: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', color: '#334155' }}>
                <input type="checkbox" checked={editingVariant.status === 'active'}
                  onChange={e => setEditingVariant({ ...editingVariant, status: e.target.checked ? 'active' : 'inactive' })} />
                Aktif
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', color: '#334155' }}>
                <input type="checkbox" checked={!!editingVariant.is_virtual}
                  onChange={e => setEditingVariant({ ...editingVariant, is_virtual: e.target.checked })} />
                Virtual
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', color: '#334155' }}>
                <input type="checkbox" checked={!!editingVariant.is_downloadable}
                  onChange={e => setEditingVariant({ ...editingVariant, is_downloadable: e.target.checked })} />
                Downloadable
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', color: '#334155' }}>
                <input type="checkbox" checked={!!editingVariant.manage_stock}
                  onChange={e => setEditingVariant({ ...editingVariant, manage_stock: e.target.checked })} />
                Kelola Stok
              </label>
            </div>

            <div className="ep-modal-grid">
              {/* Image Selector */}
              <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: 14, background: '#f8fafc', padding: 12, borderRadius: 12 }}>
                <img src={editingVariant.image || '/placeholder-product.webp'} alt="Preview"
                  style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover', background: '#fff', border: '1.5px solid #e2e8f0' }}
                  onError={e => e.target.src = '/placeholder-product.webp'} />
                <div>
                  <button type="button" onClick={() => { setMediaType('variant_image_edit'); setMediaOpen(true); }}
                    style={{ padding: '6px 12px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', marginBottom: 4 }}>
                    Pilih Gambar Varian
                  </button>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>Resolusi rekomendasi: 800x800px</div>
                </div>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={S.lbl}>Nama Varian</label>
                <input type="text" className="wc-inp" style={{ ...S.input, fontWeight: 800 }}
                  value={editingVariant.name} onChange={e => setEditingVariant({ ...editingVariant, name: e.target.value })} />
              </div>

              <div>
                <label style={S.lbl}>SKU Varian</label>
                <input type="text" className="wc-inp" style={S.input}
                  value={editingVariant.sku} onChange={e => setEditingVariant({ ...editingVariant, sku: e.target.value })} />
              </div>

              <div>
                <label style={S.lbl}>Berat (Gram)</label>
                <input type="number" className="wc-inp" style={S.input}
                  value={editingVariant.weight} onChange={e => setEditingVariant({ ...editingVariant, weight: e.target.value })} placeholder="0" />
              </div>

              <div>
                <label style={S.lbl}>Dimensi (P × L × T) (cm)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <input type="number" className="wc-inp" style={S.input} placeholder="P"
                    value={editingVariant.length || ''} onChange={e => setEditingVariant({ ...editingVariant, length: e.target.value })} />
                  <input type="number" className="wc-inp" style={S.input} placeholder="L"
                    value={editingVariant.width || ''} onChange={e => setEditingVariant({ ...editingVariant, width: e.target.value })} />
                  <input type="number" className="wc-inp" style={S.input} placeholder="T"
                    value={editingVariant.height || ''} onChange={e => setEditingVariant({ ...editingVariant, height: e.target.value })} />
                </div>
              </div>

              <div>
                <label style={S.lbl}>Harga Jual Normal (Rp) *</label>
                <input type="number" className="wc-inp" style={{ ...S.input, fontWeight: 800, color: '#4361ee' }}
                  value={editingVariant.price} onChange={e => setEditingVariant({ ...editingVariant, price: e.target.value })} placeholder="0" />
              </div>

              <div>
                <label style={S.lbl}>Harga Sale / Coret (Rp)</label>
                <input type="number" className="wc-inp" style={S.input}
                  value={editingVariant.old_price} onChange={e => setEditingVariant({ ...editingVariant, old_price: e.target.value })} placeholder="Kosongkan jika tidak ada" />
              </div>

              <div>
                <label style={S.lbl}>Modal / COGS (Rp) *</label>
                <input type="number" className="wc-inp" style={{ ...S.input, color: '#dc2626' }}
                  value={editingVariant.cogs} onChange={e => setEditingVariant({ ...editingVariant, cogs: e.target.value })} placeholder="0" />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                {editingVariant.manage_stock && (
                  <div>
                    <label style={S.lbl}>Jumlah Stok Varian</label>
                    <input type="number" className="wc-inp" style={{ ...S.input, fontWeight: 800 }}
                      value={editingVariant.stock} onChange={e => setEditingVariant({ ...editingVariant, stock: e.target.value })} />
                  </div>
                )}
              </div>

              <div>
                <label style={S.lbl}>Status Pajak</label>
                <AdminSelect className="wc-inp" style={S.select} value={editingVariant.tax_status} onChange={e => setEditingVariant({ ...editingVariant, tax_status: e.target.value })}>
                  <option value="taxable">Kena Pajak (Taxable)</option>
                  <option value="reduced">Pajak Dikurangi (Reduced Rate)</option>
                  <option value="none">Bebas Pajak (Zero Rate)</option>
                </AdminSelect>
              </div>

              <div>
                <label style={S.lbl}>Kelas Pajak</label>
                <AdminSelect className="wc-inp" style={S.select} value={editingVariant.tax_class} onChange={e => setEditingVariant({ ...editingVariant, tax_class: e.target.value })}>
                  <option value="standard">Standard</option>
                  <option value="reduced">Reduced Rate</option>
                  <option value="zero">Zero Rate</option>
                </AdminSelect>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={S.lbl}>Komisi Affiliate (Override)</label>
                <AdminSelect className="wc-inp" style={S.select} value={editingVariant.commission_preset_id || ''} onChange={e => setEditingVariant({ ...editingVariant, commission_preset_id: e.target.value })}>
                  <option value="">Gunakan Default Produk</option>
                  {presets.map(ps => <option key={ps.id} value={ps.id}>{ps.name}</option>)}
                </AdminSelect>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={S.lbl}>Deskripsi Pendek Varian</label>
                <textarea className="wc-inp" style={{ ...S.input, minHeight: 60, resize: 'vertical' }}
                  value={editingVariant.description} onChange={e => setEditingVariant({ ...editingVariant, description: e.target.value })} placeholder="Tulis deskripsi singkat varian ini..." />
              </div>

              {/* Downloadable Area */}
              {editingVariant.is_downloadable && (
                <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 14, background: '#fff0f6', padding: 14, borderRadius: 12, border: '1px solid #fbcfe8' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ ...S.lbl, color: '#9d174d' }}>Berkas Unduhan Varian</label>
                    <button type="button" onClick={() => setVariantFiles([...variantFiles, { name: '', file_url: '' }])}
                      style={{ padding: '4px 10px', background: '#fce7f3', color: '#9d174d', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                      + Tambah Berkas
                    </button>
                  </div>
                  {variantFiles.map((file, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="text" className="wc-inp" style={{ ...S.input, flex: 1, margin: 0 }} placeholder="Nama Berkas (misal: Ebook PDF)"
                        value={file.name} onChange={e => setVariantFiles(variantFiles.map((f, i) => i === idx ? { ...f, name: e.target.value } : f))} />
                      <input type="text" className="wc-inp" style={{ ...S.input, flex: 2, margin: 0 }} placeholder="URL Berkas"
                        value={file.file_url} onChange={e => setVariantFiles(variantFiles.map((f, i) => i === idx ? { ...f, file_url: e.target.value } : f))} />
                      <button type="button" onClick={() => { setMediaType('variant_file_' + idx); setMediaOpen(true); }}
                        style={{ padding: '8px 12px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                        Pilih
                      </button>
                      <button type="button" onClick={() => setVariantFiles(variantFiles.filter((_, i) => i !== idx))}
                        style={{ padding: '8px', background: '#fecaca', color: '#991b1b', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <i className="bx bx-trash" />
                      </button>
                    </div>
                  ))}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ ...S.lbl, fontSize: 11, color: '#9d174d' }}>Batas Unduhan</label>
                      <input type="number" className="wc-inp" style={S.input} placeholder="Unlimited"
                        value={editingVariant.download_limit} onChange={e => setEditingVariant({ ...editingVariant, download_limit: e.target.value })} />
                    </div>
                    <div>
                      <label style={{ ...S.lbl, fontSize: 11, color: '#9d174d' }}>Kedaluwarsa Unduhan (Hari)</label>
                      <input type="number" className="wc-inp" style={S.input} placeholder="Never"
                        value={editingVariant.download_expiry} onChange={e => setEditingVariant({ ...editingVariant, download_expiry: e.target.value })} />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <button onClick={handleUpdateVariant} style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: '#4361ee', color: '#fff', fontSize: 13.5, fontWeight: 800, cursor: 'pointer' }}>
              Simpan Perubahan
            </button>
          </div>
        </div>
      )}

      {/* Media Library Modal */}
      <MediaLibraryModal
        isOpen={mediaOpen}
        onClose={() => setMediaOpen(false)}
        multiple={mediaType === 'gallery'}
        currentSelection={
          mediaType === 'gallery' ? gallery :
          mediaType === 'variant_image_new' ? newVariant.image :
          mediaType === 'variant_image_edit' ? (editingVariant?.image || '') :
          p.image
        }
        onSelect={(selected) => {
          if (mediaType === 'main') {
            set('image', selected);
          } else if (mediaType === 'gallery') {
            setGallery(selected);
            set('images', JSON.stringify(selected));
          } else if (mediaType === 'variant_image_new') {
            setNewVariant(prev => ({ ...prev, image: selected }));
          } else if (mediaType === 'variant_image_edit') {
            setEditingVariant(prev => ({ ...prev, image: selected }));
          } else if (typeof mediaType === 'string' && mediaType.startsWith('download_file_')) {
            const idx = parseInt(mediaType.replace('download_file_', ''), 10);
            const updated = [...downloadableFiles];
            if (updated[idx]) {
              updated[idx].file_url = selected;
              if (!updated[idx].name) {
                const parts = selected.split('/');
                const filename = parts[parts.length - 1];
                updated[idx].name = filename || 'File';
              }
              setDownloadableFiles(updated);
            }
          } else if (typeof mediaType === 'string' && mediaType.startsWith('variant_file_')) {
            const idx = parseInt(mediaType.replace('variant_file_', ''), 10);
            const updated = [...variantFiles];
            if (updated[idx]) {
              updated[idx].file_url = selected;
              if (!updated[idx].name) {
                const parts = selected.split('/');
                const filename = parts[parts.length - 1];
                updated[idx].name = filename || 'File';
              }
              setVariantFiles(updated);
            }
          }
        }}
      />
    </div>
  );
}
