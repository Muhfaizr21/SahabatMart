import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson, formatImage } from '../../lib/api';
import Barcode from 'react-barcode';
import { PageHeader, StatRow, TablePanel, idr, fmtDate, A, Modal } from '../../lib/adminStyles.jsx';
import { toast } from 'react-hot-toast';

import AdminSelect from '../../components/admin/AdminSelect';

const API = ADMIN_API_BASE;

const S_INP = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid #cbd5e1',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box'
};

const filterSelectStyle = {
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  background: '#fff',
  fontSize: 12.5,
  fontWeight: 500,
  color: '#334155',
  outline: 'none',
  cursor: 'pointer',
  height: 34,
};

const filterButtonStyle = {
  padding: '6px 14px',
  borderRadius: 6,
  border: '1px solid #94a3b8',
  background: '#f8fafc',
  color: '#334155',
  fontSize: 12.5,
  fontWeight: 700,
  cursor: 'pointer',
  height: 34,
  display: 'inline-flex',
  alignItems: 'center',
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
};

const compTh = {
  padding: '8px 10px',
  fontSize: 10,
  fontWeight: 800,
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  background: '#f8fafc',
  borderBottom: '1px solid #f1f5f9',
  whiteSpace: 'nowrap',
};

const compTd = (isLast) => ({
  padding: '8px 10px',
  borderBottom: '1px solid #f8fafc',
  verticalAlign: 'middle',
  fontSize: 13,
  color: '#334155',
  paddingBottom: isLast ? 100 : 8,
});

const getSeoScore = (p) => {
  if (!p.seo_title && !p.seo_description && !p.seo_keywords) return 'grey';
  if (p.seo_title && p.seo_description && p.seo_keywords) return 'green';
  return 'orange';
};

const getReadabilityScore = (p) => {
  const desc = p.description || '';
  if (desc.length === 0) return 'grey';
  if (desc.length > 150) return 'green';
  if (desc.length > 50) return 'orange';
  return 'red';
};

export default function AdminProductList() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Status tab (All, active, taken_down, pending)
  const [tab, setTab] = useState('');
  
  // Searching & sorting
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [order, setOrder] = useState('desc');
  
  // Modals & Row Selection
  const [showQR, setShowQR] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [hoveredRowId, setHoveredRowId] = useState(null);
  
  // WooCommerce filters state
  const [bulkAction, setBulkAction] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterProductType, setFilterProductType] = useState('');
  const [filterStockStatus, setFilterStockStatus] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterSeoScore, setFilterSeoScore] = useState('');
  const [filterReadabilityScore, setFilterReadabilityScore] = useState('');

  // Applied Filters State (Applied upon clicking "Filter" button)
  const [appliedCategory, setAppliedCategory] = useState('');
  const [appliedProductType, setAppliedProductType] = useState('');
  const [appliedStockStatus, setAppliedStockStatus] = useState('');
  const [appliedBrand, setAppliedBrand] = useState('');
  const [appliedSeoScore, setAppliedSeoScore] = useState('');
  const [appliedReadabilityScore, setAppliedReadabilityScore] = useState('');


  // Removed featuredIds local state as it is now managed by backend.

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Load products list
  const load = useCallback(() => {
    setLoading(true);
    setSelectedIds([]);
    const p = new URLSearchParams();
    if (tab) p.append('status', tab);
    if (debouncedSearch) p.append('search', debouncedSearch);
    if (sortBy) p.append('sort', sortBy);
    if (order) p.append('order', order);
    
    fetchJson(`${API}/products?${p}`)
      .then(d => setProducts(Array.isArray(d) ? d : (d?.data || [])))
      .catch(err => toast.error('Gagal memuat produk: ' + err.message))
      .finally(() => setLoading(false));
  }, [tab, debouncedSearch, sortBy, order]);

  useEffect(() => {
    load();
  }, [load]);

  // Load categories and brands for filters
  useEffect(() => {
    fetchJson(`${API}/categories`)
      .then(d => setCategories(Array.isArray(d) ? d : (d?.data || [])))
      .catch(console.error);

    fetchJson(`${API}/brands`)
      .then(d => setBrands(Array.isArray(d) ? d : (d?.data || [])))
      .catch(console.error);
  }, []);

  const handlePrintLabel = (product) => {
    const dataToEncode = product.sku || String(product.id);
    const htmlContent = `
      <html>
        <head>
          <title>Cetak Label - ${product.name}</title>
          <style>
            body { 
              font-family: 'Inter', sans-serif; 
              margin: 0; 
              padding: 20px; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              height: 100vh;
              box-sizing: border-box;
            }
            .barcode-card { 
              border: 1px dashed #ccc; 
              padding: 24px; 
              text-align: center; 
              border-radius: 12px; 
              max-width: 320px;
              width: 100%;
              box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            }
            .barcode-card svg { 
              max-width: 100%; 
              height: auto; 
            }
            .title { 
              font-size: 14px; 
              font-weight: 700; 
              margin-bottom: 8px; 
              color: #0f172a;
              line-height: 1.3;
            }
            @media print { 
              body { padding: 0; } 
              .barcode-card { 
                border: none; 
                box-shadow: none; 
                padding: 0;
                margin: auto;
              } 
            }
          </style>
        </head>
        <body>
          <div class="barcode-card">
            <div class="title">${product.name}</div>
            <svg id="barcode"></svg>
          </div>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.0/dist/JsBarcode.all.min.js"></script>
          <script>
            JsBarcode("#barcode", "${dataToEncode}", {
              format: "CODE128",
              width: 2,
              height: 60,
              displayValue: true,
              fontSize: 14,
              margin: 0
            });
            setTimeout(() => { window.print(); window.close(); }, 1000);
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const del = (id) => {
    if (!window.confirm('Hapus produk ini secara permanen?')) return;
    setLoading(true);
    fetchJson(`${API}/products/delete?id=${id}`, { method: 'DELETE' })
      .then(() => {
        toast.success('Produk berhasil dihapus');
        load();
      })
      .catch(e => {
        toast.error('Gagal menghapus: ' + e.message);
        setLoading(false);
      });
  };

  const bulkDelete = () => {
    if (!window.confirm(`Hapus ${selectedIds.length} produk terpilih secara permanen?`)) return;
    setLoading(true);
    fetchJson(`${API}/products/bulk-delete`, {
      method: 'POST',
      body: JSON.stringify({ ids: selectedIds })
    }).then(() => {
      toast.success('Batch hapus berhasil');
      load();
    }).catch(e => {
      toast.error('Gagal menghapus batch: ' + e.message);
      setLoading(false);
    });
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = (filteredList) => {
    if (selectedIds.length === filteredList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredList.map(p => p.id));
    }
  };

  const toggleFeatured = async (id) => {
    try {
      const res = await fetchJson(`${API}/products/toggle-featured`, {
        method: 'PUT',
        body: JSON.stringify({ id })
      });
      if (res.status === 'success') {
        toast.success(res.is_featured ? 'Produk ditandai sebagai unggulan!' : 'Produk dihapus dari unggulan');
        setProducts(prev => prev.map(p => p.id === id ? { ...p, is_featured: res.is_featured } : p));
      } else {
        toast.error('Gagal memperbarui status');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan jaringan');
    }
  };

  const handleBulkApply = () => {
    if (bulkAction === 'delete') {
      if (selectedIds.length === 0) {
        toast.error('Pilih produk terlebih dahulu!');
        return;
      }
      bulkDelete();
    } else if (bulkAction === 'edit') {
      if (selectedIds.length === 0) {
        toast.error('Pilih produk terlebih dahulu!');
        return;
      }
      toast.success(`Mengedit ${selectedIds.length} produk terpilih...`);
    }
  };

  const handleApplyFilters = () => {
    setAppliedCategory(filterCategory);
    setAppliedProductType(filterProductType);
    setAppliedStockStatus(filterStockStatus);
    setAppliedBrand(filterBrand);
    setAppliedSeoScore(filterSeoScore);
    setAppliedReadabilityScore(filterReadabilityScore);
  };

  const handleSort = (key) => {
    if (sortBy === key) {
      setOrder(o => o === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setOrder('desc');
    }
  };

  const stats = useMemo(() => {
    const list = Array.isArray(products) ? products : [];
    return {
      total:    list.length,
      active:   list.filter(p => p.status === 'active').length,
      takenDown:list.filter(p => p.status === 'taken_down').length,
      pending:  list.filter(p => p.status === 'pending').length,
    };
  }, [products]);

  // Client-side filtering logic
  const filteredProducts = useMemo(() => {
    let list = Array.isArray(products) ? products : [];
    
    if (appliedCategory) {
      list = list.filter(p => p.category === appliedCategory);
    }
    if (appliedProductType) {
      list = list.filter(p => p.product_type === appliedProductType);
    }
    if (appliedStockStatus) {
      if (appliedStockStatus === 'in_stock') list = list.filter(p => p.stock > 0);
      else if (appliedStockStatus === 'out_of_stock') list = list.filter(p => p.stock <= 0);
    }
    if (appliedBrand) {
      list = list.filter(p => p.brand === appliedBrand);
    }
    if (appliedSeoScore) {
      list = list.filter(p => getSeoScore(p) === appliedSeoScore);
    }
    if (appliedReadabilityScore) {
      list = list.filter(p => getReadabilityScore(p) === appliedReadabilityScore);
    }

    return list;
  }, [products, appliedCategory, appliedProductType, appliedStockStatus, appliedBrand, appliedSeoScore, appliedReadabilityScore]);

  // WooCommerce-style Filters Row
  const woocommerceToolbar = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', padding: '4px 0' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        
        {/* Left Filters Block */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          
          <AdminSelect 
            style={filterSelectStyle} 
            value={bulkAction} 
            onChange={e => setBulkAction(e.target.value)}
          >
            <option value="">Tindakan massal</option>
            <option value="edit">Edit</option>
            <option value="delete">Hapus</option>
          </AdminSelect>
          <button type="button" onClick={handleBulkApply} style={filterButtonStyle}>
            Terapkan
          </button>
          
          <div style={{ width: 1, height: 18, background: '#cbd5e1', margin: '0 4px' }} />

          {/* SEO Scores */}
          <AdminSelect 
            style={filterSelectStyle} 
            value={filterSeoScore} 
            onChange={e => setFilterSeoScore(e.target.value)}
          >
            <option value="">Semua Skor SEO</option>
            <option value="green">Sangat Baik (Hijau)</option>
            <option value="orange">Cukup (Oranye)</option>
            <option value="red">Perlu Perbaikan (Merah)</option>
            <option value="grey">Belum Diset (Abu-abu)</option>
          </AdminSelect>

          {/* Readability Scores */}
          <AdminSelect 
            style={filterSelectStyle} 
            value={filterReadabilityScore} 
            onChange={e => setFilterReadabilityScore(e.target.value)}
          >
            <option value="">Semua Keterbacaan</option>
            <option value="green">Sangat Baik (Hijau)</option>
            <option value="orange">Cukup (Oranye)</option>
            <option value="red">Perlu Perbaikan (Merah)</option>
            <option value="grey">Belum Diset (Abu-abu)</option>
          </AdminSelect>

          {/* Category */}
          <AdminSelect 
            style={filterSelectStyle} 
            value={filterCategory} 
            onChange={e => setFilterCategory(e.target.value)}
          >
            <option value="">Pilih kategori</option>
            {categories.map(c => (
              <option key={c.id || c.name} value={c.name}>{c.name}</option>
            ))}
          </AdminSelect>

          {/* Product Type */}
          <AdminSelect 
            style={filterSelectStyle} 
            value={filterProductType} 
            onChange={e => setFilterProductType(e.target.value)}
          >
            <option value="">Filter tipe produk</option>
            <option value="simple">Produk Sederhana</option>
            <option value="variable">Produk Variabel</option>
            <option value="digital">Produk Digital</option>
            <option value="grouped">Produk Bundel</option>
            <option value="external">Produk Eksternal</option>
          </AdminSelect>

          {/* Stock status */}
          <AdminSelect 
            style={filterSelectStyle} 
            value={filterStockStatus} 
            onChange={e => setFilterStockStatus(e.target.value)}
          >
            <option value="">Filter status stok</option>
            <option value="in_stock">Tersedia (In stock)</option>
            <option value="out_of_stock">Habis (Out of stock)</option>
          </AdminSelect>

          {/* Brand */}
          <AdminSelect 
            style={filterSelectStyle} 
            value={filterBrand} 
            onChange={e => setFilterBrand(e.target.value)}
          >
            <option value="">Filter merek/brand</option>
            {brands.map(b => (
              <option key={b.id || b.name} value={b.name}>{b.name}</option>
            ))}
          </AdminSelect>

          <button type="button" onClick={handleApplyFilters} style={{ ...filterButtonStyle, background: '#6366f1', color: '#fff', borderColor: '#4f46e5' }}>
            Filter
          </button>
        </div>

        {/* Right Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              style={{
                padding: '6px 12px', paddingRight: 30,
                borderRadius: 6, border: '1px solid #cbd5e1',
                fontSize: 12.5, outline: 'none', height: 34, width: 180
              }}
              placeholder="Cari produk..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button 
                type="button" 
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
              >
                <i className="bx bxs-x-circle" style={{ fontSize: 16 }} />
              </button>
            )}
          </div>
          <button type="button" style={{ ...filterButtonStyle, width: 34, padding: 0, justifyContent: 'center' }} onClick={load}>
            <i className="bx bx-refresh" style={{ fontSize: 18 }} />
          </button>
        </div>

      </div>
    </div>
  );

  // WooCommerce-style Status Tabs
  const topTabs = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b', marginBottom: 12, flexWrap: 'wrap', fontWeight: 500 }}>
      <button 
        onClick={() => setTab('')} 
        style={{ 
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          color: tab === '' ? '#0f172a' : '#2563eb', fontWeight: tab === '' ? 700 : 500
        }}
      >
        Semua ({stats.total})
      </button>
      <span style={{ color: '#cbd5e1' }}>|</span>
      <button 
        onClick={() => setTab('active')} 
        style={{ 
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          color: tab === 'active' ? '#0f172a' : '#2563eb', fontWeight: tab === 'active' ? 700 : 500
        }}
      >
        Terbit ({stats.active})
      </button>
      <span style={{ color: '#cbd5e1' }}>|</span>
      <button 
        onClick={() => setTab('taken_down')} 
        style={{ 
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          color: tab === 'taken_down' ? '#0f172a' : '#2563eb', fontWeight: tab === 'taken_down' ? 700 : 500
        }}
      >
        Ditarik ({stats.takenDown})
      </button>
      <span style={{ color: '#cbd5e1' }}>|</span>
      <button 
        onClick={() => setTab('pending')} 
        style={{ 
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          color: tab === 'pending' ? '#0f172a' : '#2563eb', fontWeight: tab === 'pending' ? 700 : 500
        }}
      >
        Pending ({stats.pending})
      </button>
    </div>
  );

  return (
    <div style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }} className="fade-in admin-page-container">
      {/* Modal: QR Code */}
      {showQR && (
        <Modal title="Barcode Product ID" onClose={() => setShowQR(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, padding: '8px 0', textAlign: 'center' }}>
            <div style={{ 
              padding: '24px 16px', 
              background: '#fff', 
              borderRadius: 24, 
              boxShadow: '0 25px 60px rgba(99,102,241,0.14), 0 8px 16px rgba(0,0,0,0.03)',
              border: '1px solid #f1f5f9',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              width: '100%',
              maxWidth: 320,
              boxSizing: 'border-box'
            }}>
              <div style={{ maxWidth: '100%', overflow: 'hidden' }}>
                <Barcode 
                  value={showQR.sku || String(showQR.id)} 
                  width={2} 
                  height={60} 
                  fontSize={14} 
                  margin={0} 
                  background="transparent"
                />
              </div>
              <div style={{ 
                position: 'absolute', top: -12, right: -12, 
                width: 36, height: 36, borderRadius: '50%', background: '#6366f1',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 20px rgba(99,102,241,0.4)', fontSize: 18
              }}>
                <i className="bx bxs-badge-check" />
              </div>
            </div>

            <div style={{ width: '100%' }}>
              <h3 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em', lineHeight: 1.2, margin: '0 0 12px 0' }}>{showQR.name}</h3>
              <div style={{ 
                display: 'inline-flex', alignItems: 'center', gap: 7, 
                padding: '7px 14px', borderRadius: 12, background: '#f8fafc',
                color: '#64748b', fontSize: 12, fontWeight: 800,
                fontFamily: 'monospace', border: '1px solid #f1f5f9'
              }}>
                <i className="bx bx-barcode-reader" style={{ fontSize: 16, color: '#6366f1' }} />
                {(showQR.sku || String(showQR.id)).toUpperCase()}
              </div>
            </div>

            <div style={{ width: '100%', height: 1, background: 'linear-gradient(90deg, transparent, #f1f5f9, transparent)' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12, width: '100%' }}>
              <button 
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm" style={{ height: 52, borderRadius: 16, justifyContent: 'center', fontSize: 14 }} 
                onClick={() => handlePrintLabel(showQR)}
              >
                <i className="bx bx-printer" style={{ fontSize: 18 }} /> Cetak Label
              </button>
              <button 
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm" style={{ height: 52, borderRadius: 16, justifyContent: 'center', fontSize: 14 }} 
                onClick={() => setShowQR(null)}
              >
                Tutup
              </button>
            </div>
            
            <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
              Tempelkan label ini pada product fisik untuk mempercepat checkout di POS.
            </p>
          </div>
        </Modal>
      )}



      <PageHeader 
        title="Katalog Produk" 
        subtitle="Kelola dan moderasi seluruh listing produk platform AkuGlow."
      >
        <Link to="/admin/products/add" className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <i className="bx bx-plus" /> Tambah SKU Induk
        </Link>
      </PageHeader>

      <StatRow stats={[
        { label: 'Total Produk', val: stats.total,    icon: 'bxs-package',      color: '#6366f1' },
        { label: 'Aktif',        val: stats.active,   icon: 'bxs-check-circle', color: '#10b981' },
        { label: 'Ditarik',      val: stats.takenDown,icon: 'bxs-hide',         color: '#ef4444' },
        { label: 'Pending',      val: stats.pending,  icon: 'bxs-hourglass',    color: '#f59e0b' },
      ]} />

      {topTabs}

      <div style={{ maxWidth: '100%', overflow: 'hidden' }}>
        <TablePanel
          loading={loading}
          toolbar={woocommerceToolbar}
        >
        {filteredProducts.length === 0 && !loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 20px', gap: 12 }}>
            <i className="bx bxs-package" style={{ fontSize: 52, opacity: 0.15, color: '#6366f1' }} />
            <div style={{ fontWeight: 700, fontSize: 15, color: '#475569' }}>Tidak ada produk ditemukan</div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>Ubah filter atau tambahkan produk baru.</div>
            <Link to="/admin/products/add" className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm" style={{ textDecoration: 'none' }}>
              <i className="bx bx-plus" /> Tambah Produk
            </Link>
          </div>
        ) : (
          <div className="wc-table-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1200, tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ ...compTh, width: 35, paddingLeft: 10 }}>
                    <input 
                      type="checkbox" 
                      checked={filteredProducts.length > 0 && selectedIds.length === filteredProducts.length} 
                      onChange={() => toggleSelectAll(filteredProducts)}
                      style={{ width: 16, height: 16, cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ ...compTh, width: 40, textAlign: 'center' }}>
                    <i className="bx bx-image" style={{ fontSize: 16 }} />
                  </th>
                  <th style={{ ...compTh, textAlign: 'left', cursor: 'pointer', width: 300 }} onClick={() => handleSort('name')}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Nama
                      {sortBy === 'name' && <i className={`bx ${order === 'asc' ? 'bx-chevron-up' : 'bx-chevron-down'}`} style={{ color: '#6366f1', fontSize: 13 }} />}
                    </div>
                  </th>
                  <th style={{ ...compTh, textAlign: 'left', cursor: 'pointer', width: 95 }} onClick={() => handleSort('sku')}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      SKU
                      {sortBy === 'sku' && <i className={`bx ${order === 'asc' ? 'bx-chevron-up' : 'bx-chevron-down'}`} style={{ color: '#6366f1', fontSize: 13 }} />}
                    </div>
                  </th>
                  <th style={{ ...compTh, textAlign: 'left', cursor: 'pointer', width: 100 }} onClick={() => handleSort('stock')}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Stok
                      {sortBy === 'stock' && <i className={`bx ${order === 'asc' ? 'bx-chevron-up' : 'bx-chevron-down'}`} style={{ color: '#6366f1', fontSize: 13 }} />}
                    </div>
                  </th>
                  <th style={{ ...compTh, textAlign: 'left', cursor: 'pointer', width: 110 }} onClick={() => handleSort('price')}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Harga
                      {sortBy === 'price' && <i className={`bx ${order === 'asc' ? 'bx-chevron-up' : 'bx-chevron-down'}`} style={{ color: '#6366f1', fontSize: 13 }} />}
                    </div>
                  </th>
                  <th style={{ ...compTh, textAlign: 'left', width: 115 }}>Kategori</th>
                  <th style={{ ...compTh, textAlign: 'left', width: 85 }}>Tag</th>
                  <th style={{ ...compTh, textAlign: 'center', width: 35 }}>
                    <i className="bx bx-star" title="Featured" style={{ fontSize: 15, color: '#f59e0b' }} />
                  </th>
                  <th style={{ ...compTh, textAlign: 'left', cursor: 'pointer', width: 105 }} onClick={() => handleSort('created_at')}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Tanggal
                      {sortBy === 'created_at' && <i className={`bx ${order === 'asc' ? 'bx-chevron-up' : 'bx-chevron-down'}`} style={{ color: '#6366f1', fontSize: 13 }} />}
                    </div>
                  </th>
                  {/* SEO Columns */}
                  <th style={{ ...compTh, textAlign: 'center', width: 30 }}>
                    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#6366f1', verticalAlign: 'middle' }} title="SEO Score" />
                  </th>
                  <th style={{ ...compTh, textAlign: 'center', width: 30 }}>
                    <i className="bx bx-edit" title="Readability Score" style={{ fontSize: 15 }} />
                  </th>
                  <th style={{ ...compTh, textAlign: 'center', width: 30 }}>
                    <i className="bx bx-link-external" title="Outgoing links count" style={{ fontSize: 15 }} />
                  </th>
                  <th style={{ ...compTh, textAlign: 'center', width: 30 }}>
                    <i className="bx bx-link" title="Received links count" style={{ fontSize: 15 }} />
                  </th>
                  <th style={{ ...compTh, textAlign: 'left', width: 90 }}>Brand</th>
                  <th style={{ ...compTh, textAlign: 'center', width: 35 }}>
                    <i className="bx bx-trash" title="Aksi" style={{ fontSize: 15 }} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p, idx) => {
                  const isSelected = selectedIds.includes(p.id);
                  const isLast = idx === filteredProducts.length - 1;
                  
                  // SEO calculations
                  const seo = getSeoScore(p);
                  const seoColor = seo === 'green' ? '#10b981' : seo === 'orange' ? '#f59e0b' : seo === 'red' ? '#ef4444' : '#cbd5e1';
                  
                  const read = getReadabilityScore(p);
                  const readColor = read === 'green' ? '#10b981' : read === 'orange' ? '#f59e0b' : read === 'red' ? '#ef4444' : '#cbd5e1';

                  const outbound = p.product_url ? 1 : 0;

                  return (
                    <React.Fragment key={p.id}>
                    <tr
                      style={{ 
                        background: isSelected ? '#f5f7ff' : (idx % 2 === 0 ? '#fff' : '#fafafa'),
                        borderBottom: isLast ? 'none' : '1px solid #f8fafc'
                      }}
                      onMouseEnter={() => setHoveredRowId(p.id)}
                      onMouseLeave={() => setHoveredRowId(null)}
                    >
                      {/* Checkbox */}
                      <td style={{ ...compTd(isLast), paddingLeft: 10 }}>
                        <input 
                          type="checkbox" 
                          checked={isSelected} 
                          onChange={() => toggleSelect(p.id)}
                          style={{ width: 16, height: 16, cursor: 'pointer' }}
                        />
                      </td>
                      
                      {/* Image Thumbnail */}
                      <td style={{ ...compTd(isLast), textAlign: 'center' }}>
                        <div style={{ width: 32, height: 32, borderRadius: 6, overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <img 
                            src={formatImage(p.image)} 
                            alt="" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={e => {
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name || 'P')}&background=eef2ff&color=6366f1&size=80&bold=true`;
                            }}
                          />
                        </div>
                      </td>

                      {/* Name + Action hover menu */}
                      <td style={{ ...compTd(isLast) }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <Link 
                            to={`/admin/products/edit?id=${p.id}`} 
                            style={{ fontSize: 13, fontWeight: 700, color: '#2563eb', textDecoration: 'none' }}
                            className="product-name-hover"
                          >
                            {p.name}
                          </Link>
                          
                          {/* Badges for Product Types */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                            {p.product_type === 'variable' && <span style={{ padding: '2px 6px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 10, color: '#475569', fontWeight: 600 }}>Variabel</span>}
                            {p.product_type === 'digital' && <span style={{ padding: '2px 6px', background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: 4, fontSize: 10, color: '#0891b2', fontWeight: 600 }}>Digital</span>}
                            {p.product_type === 'grouped' && <span style={{ padding: '2px 6px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 4, fontSize: 10, color: '#ea580c', fontWeight: 600 }}>Bundel</span>}
                            {p.product_type === 'external' && <span style={{ padding: '2px 6px', background: '#fdf2f8', border: '1px solid #fbcfe8', borderRadius: 4, fontSize: 10, color: '#db2777', fontWeight: 600 }}>Eksternal</span>}
                            {p.is_virtual && <span style={{ padding: '2px 6px', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 4, fontSize: 10, color: '#7c3aed', fontWeight: 600 }}>Virtual</span>}
                            {p.is_downloadable && <span style={{ padding: '2px 6px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 4, fontSize: 10, color: '#16a34a', fontWeight: 600 }}>Unduhan</span>}
                          </div>

                          <div style={{ 
                            display: 'flex', 
                            flexWrap: 'wrap',
                            gap: 6, 
                            marginTop: 6, 
                            fontSize: 10.5, 
                            color: '#94a3b8',
                            visibility: hoveredRowId === p.id ? 'visible' : 'hidden',
                            minHeight: 16,
                            transition: 'visibility 0.1s',
                            lineHeight: '1.2'
                          }}>
                            <span>ID: <span style={{ fontFamily: 'monospace' }}>{p.id.slice(0, 8)}</span></span>
                            <span>|</span>
                            <Link to={`/admin/products/edit?id=${p.id}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>Edit</Link>
                            <span>|</span>
                            <button 
                              type="button"
                              onClick={() => del(p.id)} 
                              style={{ background: 'none', border: 'none', padding: 0, color: '#ef4444', cursor: 'pointer', fontSize: 10.5, fontWeight: 600 }}
                            >
                              Sampah
                            </button>
                            <span>|</span>
                            <Link to={`/product/${p.slug || p.id}`} target="_blank" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>Lihat</Link>
                            <span>|</span>
                            <button 
                              type="button"
                              onClick={() => setShowQR(p)} 
                              style={{ background: 'none', border: 'none', padding: 0, color: '#ec4899', cursor: 'pointer', fontSize: 10.5, fontWeight: 600 }}
                            >
                              Barcode
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* SKU */}
                      <td style={{ ...compTd(isLast) }}>
                        <span style={{ fontSize: 12.5, color: '#64748b', fontFamily: 'monospace' }}>
                          {p.sku || '—'}
                        </span>
                      </td>

                      {/* Stock */}
                      <td style={{ ...compTd(isLast) }}>
                        {p.product_type === 'variable' ? (
                          <span style={{ fontSize: 12.5, color: '#2563eb', fontWeight: 600 }}>Tersedia (Varian)</span>
                        ) : p.product_type === 'external' ? (
                          <span style={{ fontSize: 12.5, color: '#64748b' }}>—</span>
                        ) : p.is_virtual || p.is_downloadable || p.product_type === 'digital' ? (
                          <span style={{ fontSize: 12.5, color: '#16a34a', fontWeight: 700 }}>Selalu Tersedia</span>
                        ) : p.stock > 0 ? (
                          <span style={{ fontSize: 12.5, color: '#16a34a', fontWeight: 700 }}>Tersedia ({p.stock})</span>
                        ) : (
                          <span style={{ fontSize: 12.5, color: '#dc2626', fontWeight: 700 }}>Habis (0)</span>
                        )}
                      </td>

                      {/* Price with strikethrough if on sale */}
                      <td style={{ ...compTd(isLast) }}>
                        {p.product_type === 'variable' ? (
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {p.max_price > p.price ? (
                              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1e293b' }}>
                                {idr(p.price)} - {idr(p.max_price)}
                              </span>
                            ) : (
                              <>
                                <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Mulai dari</span>
                                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1e293b' }}>{idr(p.price)}</span>
                              </>
                            )}
                          </div>
                        ) : p.product_type === 'external' ? (
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1e293b' }}>{idr(p.price)}</span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {p.old_price > p.price ? (
                              <>
                                <span style={{ fontSize: 10.5, color: '#94a3b8', textDecoration: 'line-through' }}>{idr(p.old_price)}</span>
                                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1e293b' }}>{idr(p.price)}</span>
                              </>
                            ) : (
                              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1e293b' }}>{idr(p.price)}</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td style={{ ...compTd(isLast) }}>
                        <Link to={`/shop?cat=${p.category}`} style={{ fontSize: 12.5, color: '#2563eb', textDecoration: 'none' }}>
                          {p.category || '—'}
                        </Link>
                      </td>

                      {/* Tags */}
                      <td style={{ ...compTd(isLast) }}>
                        <span style={{ fontSize: 12.5, color: '#64748b' }}>
                          {p.tags || '—'}
                        </span>
                      </td>

                      {/* Star (Featured) */}
                      <td style={{ ...compTd(isLast), textAlign: 'center' }}>
                        <button 
                          type="button" 
                          onClick={() => toggleFeatured(p.id)}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', justifyContent: 'center', width: '100%', outline: 'none' }}
                        >
                          <i className={`bx ${p.is_featured ? 'bxs-star' : 'bx-star'}`} style={{ fontSize: 15, color: p.is_featured ? '#f59e0b' : '#cbd5e1' }} />
                        </button>
                      </td>

                      {/* Date */}
                      <td style={{ ...compTd(isLast) }}>
                        <div style={{ fontSize: 11.5, color: '#64748b', lineHeight: 1.3 }}>
                          <div>{p.status === 'active' ? 'Terbit' : 'Draft/Ditarik'}</div>
                          <div style={{ fontSize: 10, color: '#94a3b8' }}>{fmtDate(p.created_at)}</div>
                        </div>
                      </td>

                      {/* Yoast SEO Dot */}
                      <td style={{ ...compTd(isLast), textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: seoColor }} title={`SEO: ${seo}`} />
                        </div>
                      </td>

                      {/* Yoast Readability Dot */}
                      <td style={{ ...compTd(isLast), textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: readColor }} title={`Keterbacaan: ${read}`} />
                        </div>
                      </td>

                      {/* Outbound Links Count */}
                      <td style={{ ...compTd(isLast), textAlign: 'center' }}>
                        <span style={{ fontSize: 12, color: '#64748b' }}>{outbound}</span>
                      </td>

                      {/* Received Links Count */}
                      <td style={{ ...compTd(isLast), textAlign: 'center' }}>
                        <span style={{ fontSize: 12, color: '#64748b' }}>0</span>
                      </td>

                      {/* Brand */}
                      <td style={{ ...compTd(isLast) }}>
                        <span style={{ fontSize: 12.5, color: '#475569' }}>
                          {p.brand || '—'}
                        </span>
                      </td>

                      {/* Quick Trash Action */}
                      <td style={{ ...compTd(isLast), textAlign: 'center' }}>
                        <button 
                          type="button" 
                          onClick={() => del(p.id)} 
                          style={{ ...A.iconBtn('#ef4444', 'rgba(239,68,68,0.08)'), width: 26, height: 26, borderRadius: 6 }}
                          title="Hapus"
                        >
                          <i className="bx bx-trash" style={{ fontSize: 13 }} />
                        </button>
                      </td>
                    </tr>

                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filteredProducts.length > 0 && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
              Menampilkan <strong style={{ color: '#0f172a' }}>{filteredProducts.length}</strong> produk terbaik Anda
            </span>
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>Terakhir diperbarui {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        )}
      </TablePanel>
      </div>

      <style>{`
        .product-name-hover:hover { color: #6366f1 !important; text-decoration: underline; }
        .wc-table-wrapper {
          overflow-x: auto;
          width: 100%;
          -webkit-overflow-scrolling: touch;
        }
        @media (max-width: 992px) {
          .wc-toolbar-left {
            width: 100%;
            margin-bottom: 8px;
          }
          .wc-toolbar-right {
            width: 100%;
            justify-content: space-between;
          }
        }
        @media (max-width: 768px) {
          .wc-toolbar-left {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            width: 100%;
          }
          .wc-toolbar-left select, .wc-toolbar-left button {
            width: 100% !important;
          }
          .wc-toolbar-right {
            width: 100%;
          }
          .wc-toolbar-right input {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
