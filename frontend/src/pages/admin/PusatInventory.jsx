import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { fetchJson, postJson, ADMIN_API_BASE, formatImage } from '../../lib/api';
import { PageHeader, StatRow, TablePanel, statusBadge, idr, fmtDate, A, Modal, FieldLabel } from '../../lib/adminStyles.jsx';
import toast from 'react-hot-toast';

import AdminSelect from '../../components/admin/AdminSelect';

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
  padding: '8px 6px',
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
  padding: '8px 6px',
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


const CustomSelect = ({ label, value, options, onChange, icon }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const clickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  const selectedOption = options.find(o => String(o.value) === String(value));

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', borderRadius: 12,
          border: '1px solid #e2e8f0', background: '#fff',
          fontSize: 13, fontWeight: 600, color: '#334155',
          cursor: 'pointer', outline: 'none', transition: 'all 0.2s',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = '#6366f1'}
        onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
        onClick={() => setOpen(!open)}
      >
        {icon && <i className={`bx ${icon}`} style={{ fontSize: 16, color: '#6366f1' }} />}
        <span>{label}: <strong>{selectedOption ? selectedOption.label : 'Semua'}</strong></span>
        <i className="bx bx-chevron-down" style={{ fontSize: 14, color: '#94a3b8', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 150,
          background: '#fff', border: '1px solid #f1f5f9', borderRadius: 12,
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)',
          minWidth: 180, overflow: 'hidden', padding: 4,
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8,
                border: 'none', background: String(value) === String(opt.value) ? '#f5f3ff' : 'transparent',
                color: String(value) === String(opt.value) ? '#6366f1' : '#475569',
                fontSize: 12.5, fontWeight: String(value) === String(opt.value) ? 700 : 500,
                textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                if (String(value) !== String(opt.value)) {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.color = '#0f172a';
                }
              }}
              onMouseLeave={e => {
                if (String(value) !== String(opt.value)) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#475569';
                }
              }}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const Pagination = ({ currentPage, totalItems, pageSize, onPageChange, onPageSizeChange, label = "data" }) => {
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIdx = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, totalItems);

  const pageNumbers = [];
  const maxPagesToShow = 5;
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
  if (endPage - startPage + 1 < maxPagesToShow) {
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
  }
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '18px 24px', background: '#fff', borderTop: '1px solid #f1f5f9', borderRadius: '0 0 24px 24px', boxShadow: 'inset 0 1px 0 0 #f1f5f9' }}>
      <style>{`
        .sm-pg-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: #fff;
          color: #475569;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
          outline: none;
        }
        .sm-pg-btn:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #cbd5e1;
          color: #0f172a;
          transform: translateY(-1px);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }
        .sm-pg-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .sm-pg-btn-active {
          background: linear-gradient(135deg, #6366f1, #4f46e5) !important;
          border: none !important;
          color: #fff !important;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3) !important;
        }
        .sm-pg-btn-active:hover {
          background: linear-gradient(135deg, #4f46e5, #4338ca) !important;
        }
        .sm-pg-btn:disabled {
          background: #f8fafc;
          border-color: #f1f5f9;
          color: #cbd5e1;
          cursor: not-allowed;
          opacity: 0.55;
          box-shadow: none;
        }
        .sm-pg-select {
          padding: 6px 32px 6px 12px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          outline: none;
          background: #fff url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 10px center;
          background-size: 14px;
          cursor: pointer;
          font-weight: 700;
          font-size: 13px;
          color: #334155;
          transition: all 0.2s ease;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
          appearance: none;
          -webkit-appearance: none;
          min-width: 68px;
        }
        .sm-pg-select:hover {
          border-color: #cbd5e1;
        }
        .sm-pg-select:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }
      `}</style>

      <div style={{ fontSize: 13.5, fontWeight: 600, color: '#64748b' }}>
        Menampilkan <strong style={{ color: '#0f172a', fontWeight: 800 }}>{startIdx}-{endIdx}</strong> dari <strong style={{ color: '#0f172a', fontWeight: 800 }}>{totalItems}</strong> {label}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: '#64748b', fontWeight: 600 }}>
          <span>Tampilkan:</span>
          <AdminSelect 
            value={pageSize} 
            onChange={e => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="sm-pg-select"
          >
            {[15, 30, 50, 100].map(sz => (
              <option key={sz} value={sz}>{sz}</option>
            ))}
          </AdminSelect>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button 
              type="button" 
              onClick={() => onPageChange(1)} 
              disabled={currentPage === 1}
              className="sm-pg-btn"
              title="Halaman Pertama"
            >
              <i className="bx bx-chevrons-left" style={{ fontSize: 18 }} />
            </button>
            <button 
              type="button" 
              onClick={() => onPageChange(currentPage - 1)} 
              disabled={currentPage === 1}
              className="sm-pg-btn"
              title="Halaman Sebelumnya"
            >
              <i className="bx bx-chevron-left" style={{ fontSize: 18 }} />
            </button>
            {pageNumbers.map(pg => (
              <button
                key={pg}
                type="button"
                onClick={() => onPageChange(pg)}
                className={`sm-pg-btn ${pg === currentPage ? 'sm-pg-btn-active' : ''}`}
              >
                {pg}
              </button>
            ))}
            <button 
              type="button" 
              onClick={() => onPageChange(currentPage + 1)} 
              disabled={currentPage === totalPages}
              className="sm-pg-btn"
              title="Halaman Berikutnya"
            >
              <i className="bx bx-chevron-right" style={{ fontSize: 18 }} />
            </button>
            <button 
              type="button" 
              onClick={() => onPageChange(totalPages)} 
              disabled={currentPage === totalPages}
              className="sm-pg-btn"
              title="Halaman Terakhir"
            >
              <i className="bx bx-chevrons-right" style={{ fontSize: 18 }} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default function PusatInventory() {
  const [activeTab, setActiveTab] = useState('stock'); // stock, inbound, suppliers, audit
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [inbounds, setInbounds] = useState([]);
  const [mutations, setMutations] = useState([]);
  const [stats, setStats] = useState({ totalItems: 0, totalValue: 0, lowStock: 0 });

  // Pagination States per Tab
  const [stockPage, setStockPage] = useState(1);
  const [stockPageSize, setStockPageSize] = useState(15);
  
  const [inboundPage, setInboundPage] = useState(1);
  const [inboundPageSize, setInboundPageSize] = useState(15);
  
  const [supplierPage, setSupplierPage] = useState(1);
  const [supplierPageSize, setSupplierPageSize] = useState(15);
  
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(15);

  // WooCommerce tabs state (All, active, taken_down, pending)
  const [statusTab, setStatusTab] = useState('');

  // Filter and Sorting States
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [order, setOrder] = useState('desc');
  const [showQR, setShowQR] = useState(null);
  const [quickEditProduct, setQuickEditProduct] = useState(null);
  const [quickEditData, setQuickEditData] = useState({ name: '', sku: '', price: '', stock: '' });
  const [hoveredRowId, setHoveredRowId] = useState(null);

  // WooCommerce filters state
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [selectedInboundIds, setSelectedInboundIds] = useState([]);
  const [bulkInboundAction, setBulkInboundAction] = useState('');
  const [selectedSupplierIds, setSelectedSupplierIds] = useState([]);
  const [bulkSupplierAction, setBulkSupplierAction] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterProductType, setFilterProductType] = useState('');
  const [filterStockStatus, setFilterStockStatus] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterSeoScore, setFilterSeoScore] = useState('');
  const [filterReadabilityScore, setFilterReadabilityScore] = useState('');


  // Featured Products local state
  const [featuredIds, setFeaturedIds] = useState(() => {
    try {
      const stored = localStorage.getItem('featured_product_ids');
      return stored ? JSON.parse(stored) : [];
    } catch (_) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('featured_product_ids', JSON.stringify(featuredIds));
  }, [featuredIds]);


  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setSelectedIds([]);
    try {
      const query = new URLSearchParams();
      if (statusTab) query.append('status', statusTab);
      if (debouncedSearch) query.append('search', debouncedSearch);
      
      const prodData = await fetchJson(`${ADMIN_API_BASE}/products?${query}`);
      const pList = Array.isArray(prodData) ? prodData : (prodData?.data || []);
      setProducts(pList);
    } catch (err) {
      console.error("Failed to load products:", err);
      toast.error('Gagal memuat produk');
    } finally {
      setLoading(false);
    }
  }, [statusTab, debouncedSearch]);

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

  const toggleFeatured = (id) => {
    setFeaturedIds(prev => {
      const isF = prev.includes(id);
      if (isF) {
        toast.success('Produk dihapus dari unggulan');
        return prev.filter(x => x !== id);
      } else {
        toast.success('Produk ditandai sebagai unggulan!');
        return [...prev, id];
      }
    });
  };

  const bulkDelete = () => {
    if (!window.confirm(`Hapus ${selectedIds.length} produk terpilih secara permanen?`)) return;
    setLoading(true);
    fetchJson(`${ADMIN_API_BASE}/products/bulk-delete`, {
      method: 'POST',
      body: JSON.stringify({ ids: selectedIds })
    }).then(() => {
      toast.success('Batch hapus berhasil');
      loadAllData();
      loadProducts();
    }).catch(e => {
      toast.error('Gagal menghapus batch: ' + e.message);
      setLoading(false);
    });
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

  const toggleInboundSelect = (id) => {
    setSelectedInboundIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkInboundApply = () => {
    if (bulkInboundAction === 'delete') {
      if (selectedInboundIds.length === 0) {
        toast.error('Pilih catatan inbound terlebih dahulu!');
        return;
      }
      if (!window.confirm(`Hapus ${selectedInboundIds.length} catatan inbound terpilih secara permanen?`)) return;
      setLoading(true);
      fetchJson(`${ADMIN_API_BASE}/warehouse/inbounds/bulk-delete`, {
        method: 'POST',
        body: JSON.stringify({ ids: selectedInboundIds })
      }).then(() => {
        toast.success('Batch hapus inbound berhasil');
        setSelectedInboundIds([]);
        setBulkInboundAction('');
        loadAllData();
      }).catch(e => {
        toast.error('Gagal menghapus batch inbound: ' + e.message);
        setLoading(false);
      });
    }
  };

  const toggleSupplierSelect = (id) => {
    setSelectedSupplierIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkSupplierApply = () => {
    if (bulkSupplierAction === 'delete') {
      if (selectedSupplierIds.length === 0) {
        toast.error('Pilih supplier terlebih dahulu!');
        return;
      }
      if (!window.confirm(`Hapus ${selectedSupplierIds.length} supplier terpilih secara permanen?`)) return;
      setLoading(true);
      fetchJson(`${ADMIN_API_BASE}/warehouse/suppliers/bulk-delete`, {
        method: 'POST',
        body: JSON.stringify({ ids: selectedSupplierIds })
      }).then(() => {
        toast.success('Batch hapus supplier berhasil');
        setSelectedSupplierIds([]);
        setBulkSupplierAction('');
        loadAllData();
      }).catch(e => {
        toast.error('Gagal menghapus batch supplier: ' + e.message);
        setLoading(false);
      });
    }
  };

  const handleResetFilters = () => {
    setFilterCategory('');
    setFilterProductType('');
    setFilterStockStatus('');
    setFilterBrand('');
    setFilterSeoScore('');
    setFilterReadabilityScore('');
    setSearch('');
    setStockPage(1);
    toast.success('Filter berhasil direset');
  };


  const loadAllData = async () => {
    setLoading(true);
    try {
      // 1. Load all products (without filters) to compute correct global stats
      const prodData = await fetchJson(`${ADMIN_API_BASE}/products`);
      const pList = Array.isArray(prodData) ? prodData : (prodData?.data || []);

      // 2. Load Suppliers
      const supData = await fetchJson(`${ADMIN_API_BASE}/warehouse/suppliers`);
      setSuppliers(Array.isArray(supData) ? supData : []);

      // 2b. Load Inbounds
      const inboundData = await fetchJson(`${ADMIN_API_BASE}/warehouse/inbounds`);
      setInbounds(Array.isArray(inboundData) ? inboundData : []);

      // 3. Load Audit Log (Mata Elang)
      const mutData = await fetchJson(`${ADMIN_API_BASE}/warehouse/stock-history`);
      setMutations(Array.isArray(mutData) ? mutData : []);

      // Stats calculation
      const totalItems = pList.reduce((acc, p) => acc + (p.stock || 0), 0);
      const totalValue = pList.reduce((acc, p) => acc + ((p.stock || 0) * (p.price || 0)), 0);
      const lowStock = pList.filter(p => p.stock < 10).length;
      setStats({ totalItems, totalValue, lowStock });

      setWooStats({
        total:     pList.length,
        active:    pList.filter(p => p.status === 'active').length,
        takenDown: pList.filter(p => p.status === 'taken_down').length,
        pending:   pList.filter(p => p.status === 'pending').length,
      });

    } catch (_err) {
      console.error("Warehouse Sync Error:", _err);
      toast.error('Gagal sinkronisasi data gudang');
    } finally {
      setLoading(false);
    }
  };

  const [wooStats, setWooStats] = useState({ total: 0, active: 0, takenDown: 0, pending: 0 });

  const filteredProducts = useMemo(() => {
    let list = Array.isArray(products) ? products : [];
    
    if (filterCategory) {
      list = list.filter(p => p.category === filterCategory);
    }
    if (filterProductType) {
      list = list.filter(p => p.product_type === filterProductType);
    }
    if (filterStockStatus) {
      if (filterStockStatus === 'in_stock') list = list.filter(p => p.stock > 0);
      else if (filterStockStatus === 'out_of_stock') list = list.filter(p => p.stock <= 0);
    }
    if (filterBrand) {
      list = list.filter(p => p.brand === filterBrand);
    }
    if (filterSeoScore) {
      list = list.filter(p => getSeoScore(p) === filterSeoScore);
    }
    if (filterReadabilityScore) {
      list = list.filter(p => getReadabilityScore(p) === filterReadabilityScore);
    }

    if (sortBy) {
      list = [...list].sort((a, b) => {
        let aVal = a[sortBy];
        let bVal = b[sortBy];

        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = (bVal || '').toLowerCase();
          return order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        } else {
          aVal = aVal || 0;
          bVal = bVal || 0;
          return order === 'asc' ? aVal - bVal : bVal - aVal;
        }
      });
    }

    return list;
  }, [products, filterCategory, filterProductType, filterStockStatus, filterBrand, filterSeoScore, filterReadabilityScore, sortBy, order]);
  const paginatedProducts = useMemo(() => {
    const start = (stockPage - 1) * stockPageSize;
    return filteredProducts.slice(start, start + stockPageSize);
  }, [filteredProducts, stockPage, stockPageSize]);

  const paginatedInbounds = useMemo(() => {
    const start = (inboundPage - 1) * inboundPageSize;
    return inbounds.slice(start, start + inboundPageSize);
  }, [inbounds, inboundPage, inboundPageSize]);

  const paginatedSuppliers = useMemo(() => {
    const start = (supplierPage - 1) * supplierPageSize;
    return suppliers.slice(start, start + supplierPageSize);
  }, [suppliers, supplierPage, supplierPageSize]);

  const paginatedMutations = useMemo(() => {
    const start = (auditPage - 1) * auditPageSize;
    return mutations.slice(start, start + auditPageSize);
  }, [mutations, auditPage, auditPageSize]);


  useEffect(() => {
    loadAllData();
    
    fetchJson(`${ADMIN_API_BASE}/categories`)
      .then(d => setCategories(Array.isArray(d) ? d : (d?.data || [])))
      .catch(console.error);

    fetchJson(`${ADMIN_API_BASE}/brands`)
      .then(d => setBrands(Array.isArray(d) ? d : (d?.data || [])))
      .catch(console.error);
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    setSelectedIds([]);
    setSelectedInboundIds([]);
    setSelectedSupplierIds([]);
    setBulkAction('');
    setBulkInboundAction('');
    setBulkSupplierAction('');
  }, [activeTab]);


  // Modal States
  const [showInboundModal, setShowInboundModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  
  const [inboundForm, setInboundForm] = useState({
    supplier_id: '', reference_no: '', note: '',
    items: [{ product_id: '', quantity: 1, cost_price: 0 }]
  });

  const [supplierForm, setSupplierForm] = useState({ 
    id: null, name: '', contact: '', phone: '', email: '', address: '' 
  });

  const handlePrintBarcode = async () => {
    try {
      toast('Menyiapkan data barcode...');
      const res = await fetchJson(`${ADMIN_API_BASE}/products/barcodes`);
      const allBarcodes = Array.isArray(res) ? res : (res?.data || []);
      
      if (allBarcodes.length === 0) return toast.error('Belum ada data untuk dicetak');
      
      const htmlContent = `
        <html>
          <head>
            <title>Cetak Barcode Master</title>
            <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.0/dist/JsBarcode.all.min.js"></script>
            <style>
              body { font-family: 'Inter', sans-serif; padding: 20px; display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; }
              .barcode-card { border: 1px dashed #ccc; padding: 15px; text-align: center; border-radius: 8px; }
              .title { font-size: 12px; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 5px; }
              svg { max-width: 100%; height: auto; }
              @media print { body { padding: 0; } .barcode-card { break-inside: avoid; border: 1px solid #000; } }
            </style>
          </head>
          <body>
            ${allBarcodes.map((p, i) => `
              <div class="barcode-card">
                <div class="title">${p.name}</div>
                <svg id="barcode-${i}"></svg>
              </div>
            `).join('')}
            <script>
              const barcodes = ${JSON.stringify(allBarcodes)};
              barcodes.forEach((b, i) => {
                try {
                  JsBarcode("#barcode-" + i, b.sku, {
                    format: "CODE128",
                    width: 2,
                    height: 50,
                    displayValue: true,
                    fontSize: 12,
                    margin: 0
                  });
                } catch(e) {
                  console.error('Invalid barcode data:', b.sku);
                }
              });
              setTimeout(() => window.print(), 1000);
            </script>
          </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } catch (e) {
      toast.error('Gagal memuat barcode: ' + e.message);
    }
  };

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

  const handleQuickEditSave = () => {
    if (!quickEditData.name.trim()) {
      toast.error('Nama wajib diisi!');
      return;
    }
    setLoading(true);
    fetchJson(`${ADMIN_API_BASE}/products/detail?id=${quickEditProduct.id}`)
      .then(res => {
        const item = res?.data || res;
        const payload = {
          ...item,
          name: quickEditData.name,
          sku: quickEditData.sku,
          price: parseFloat(quickEditData.price) || 0,
          stock: parseInt(quickEditData.stock) || 0,
        };
        return fetchJson(`${ADMIN_API_BASE}/products/update`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      })
      .then(() => {
        toast.success('Produk berhasil diperbarui');
        setQuickEditProduct(null);
        loadAllData();
        loadProducts();
      })
      .catch(err => {
        toast.error('Gagal memperbarui produk: ' + err.message);
        setLoading(false);
      });
  };

  const del = (id) => {
    if (!window.confirm('Hapus produk ini secara permanen?')) return;
    setLoading(true);
    fetchJson(`${ADMIN_API_BASE}/products/delete?id=${id}`, { method: 'DELETE' })
      .then(() => {
        toast.success('Produk berhasil dihapus');
        loadAllData();
        loadProducts();
      })
      .catch(e => {
        toast.error('Gagal menghapus: ' + e.message);
        setLoading(false);
      });
  };

  const handleInboundSubmit = async (e) => {
    e.preventDefault();
    if (!inboundForm.supplier_id || inboundForm.items.some(i => !i.product_id)) {
      return toast.error('Lengkapi data supplier dan produk');
    }
    try {
      await postJson(`${ADMIN_API_BASE}/warehouse/inbound`, inboundForm);
      toast.success('Stok berhasil masuk ke Gudang Pusat!');
      setShowInboundModal(false);
      loadAllData();
      setInboundForm({ supplier_id: '', reference_no: '', note: '', items: [{ product_id: '', quantity: 1, cost_price: 0 }] });
    } catch (_err) {
      toast.error(_err.message);
    }
  };

  const handleSupplierSubmit = async (e) => {
    e.preventDefault();
    try {
      let url = `${ADMIN_API_BASE}/warehouse/suppliers/create`;
      if (supplierForm.id) {
        url = `${ADMIN_API_BASE}/warehouse/suppliers/update/${supplierForm.id}`;
      }
      await postJson(url, supplierForm);
      toast.success(supplierForm.id ? 'Supplier berhasil diupdate!' : 'Supplier baru berhasil terdaftar!');
      setShowSupplierModal(false);
      loadAllData();
      setSupplierForm({ id: null, name: '', contact: '', phone: '', email: '', address: '' });
    } catch (_err) {
      toast.error(_err.message);
    }
  };

  const handleEditSupplier = (s) => {
    setSupplierForm({
      id: s.id,
      name: s.name,
      contact: s.contact || '',
      phone: s.phone || '',
      email: s.email || '',
      address: s.address || ''
    });
    setShowSupplierModal(true);
  };

  const handleDeleteSupplier = async (id) => {
    if (!window.confirm('Yakin ingin menghapus supplier ini?')) return;
    try {
      await fetchJson(`${ADMIN_API_BASE}/warehouse/suppliers/delete/${id}`, { method: 'DELETE' });
      toast.success('Supplier dihapus!');
      loadAllData();
    } catch (_err) {
      toast.error('Gagal menghapus supplier: ' + _err.message);
    }
  };

  const addInboundItem = () => {
    setInboundForm({ ...inboundForm, items: [...inboundForm.items, { product_id: '', quantity: 1, cost_price: 0 }] });
  };

  const updateInboundItem = (index, field, value) => {
    const newItems = [...inboundForm.items];
    newItems[index][field] = field === 'quantity' || field === 'cost_price' ? Number(value) : value;
    setInboundForm({ ...inboundForm, items: newItems });
  };

  const tabStyle = (id) => ({
    padding: '12px 24px',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 700,
    borderBottom: activeTab === id ? '3px solid #6366f1' : '3px solid transparent',
    color: activeTab === id ? '#6366f1' : '#64748b',
    transition: 'all 0.2s'
  });

  const filterBar = (
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

          <button type="button" onClick={handleResetFilters} style={{ ...filterButtonStyle, background: '#f1f5f9', color: '#475569', borderColor: '#cbd5e1' }} title="Reset Filter">
            <i className="bx bx-refresh" style={{ marginRight: 4 }} /> Reset
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
          <button type="button" style={{ ...filterButtonStyle, width: 34, padding: 0, justifyContent: 'center' }} onClick={loadProducts}>
            <i className="bx bx-refresh" style={{ fontSize: 18 }} />
          </button>
        </div>

      </div>
    </div>
  );


  return (
    <div style={A.page} className="fade-in inventory-dashboard">
      <style>{`
        .inventory-dashboard { padding-bottom: 40px; }
        .tab-container {
          display: flex; gap: 8px; border-bottom: 2px solid #e2e8f0; margin-bottom: 24px;
          overflow-x: auto; padding-bottom: 8px;
        }
        .tab-container::-webkit-scrollbar { height: 4px; }
        .tab-container::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .tab-item {
          padding: 12px 20px; cursor: pointer; font-size: 14px; font-weight: 700;
          color: #64748b; transition: all 0.2s; white-space: nowrap; border-radius: 12px 12px 0 0;
          position: relative;
        }
        .tab-item:hover { color: #6366f1; background: #f8fafc; }
        .tab-item.active { color: #6366f1; }
        .tab-item.active::after {
          content: ''; position: absolute; bottom: -10px; left: 0; right: 0;
          height: 3px; background: #6366f1; border-radius: 3px 3px 0 0;
        }
        .responsive-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
        }
        .inbound-row {
           display: grid; grid-template-columns: 2fr 1fr 1.5fr auto; gap: 12px; align-items: center; margin-bottom: 12px;
        }
        .product-name-hover:hover { color: #6366f1 !important; text-decoration: underline; }
        .wc-table-wrapper {
          overflow-x: auto;
          width: 100%;
          -webkit-overflow-scrolling: touch;
        }
        .hover-row { transition: all 0.2s; }
        .hover-row:hover { background: #f8fafc; }
        
        @media (max-width: 768px) {
          .responsive-grid { grid-template-columns: 1fr; gap: 12px; }
          .inbound-row { 
            grid-template-columns: 1fr; padding: 16px; background: #f8fafc; 
            border-radius: 12px; border: 1px solid #e2e8f0;
          }
          .action-td { text-align: left !important; padding-top: 0; }
        }
      `}</style>

      <PageHeader 
        title="Gudang Pusat (Command Center)" 
        subtitle="Otoritas tertinggi stok AkuGlow. Kelola amunisi barang dan pantau mutasi secara real-time."
      >
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm" onClick={loadAllData}><i className="bx bx-refresh" /> Sync Global</button>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm" onClick={handlePrintBarcode}>
            <i className="bx bx-barcode-reader" /> Cetak Barcode Master
          </button>
        </div>
      </PageHeader>

      <div className="tab-container">
        <div className={`tab-item ${activeTab === 'stock' ? 'active' : ''}`} onClick={() => setActiveTab('stock')}> Stok Master</div>
        <div className={`tab-item ${activeTab === 'inbound' ? 'active' : ''}`} onClick={() => setActiveTab('inbound')}> Inbound (Masuk)</div>
        <div className={`tab-item ${activeTab === 'suppliers' ? 'active' : ''}`} onClick={() => setActiveTab('suppliers')}> Supplier</div>
        <div className={`tab-item ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => setActiveTab('audit')}> Mata Elang</div>
      </div>

      {activeTab === 'stock' && (
        <>
          <StatRow stats={[
            { label: 'Stock On-Hand', val: stats.totalItems, icon: 'bxs-box', color: '#6366f1' },
            { label: 'Valuasi Inventori', val: idr(stats.totalValue), icon: 'bxs-badge-dollar', color: '#10b981' },
            { label: 'SKU Kritis', val: stats.lowStock, icon: 'bxs-error-circle', color: '#ef4444' },
          ]} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b', marginBottom: 12, flexWrap: 'wrap', fontWeight: 500 }}>
            <button 
              onClick={() => setStatusTab('')} 
              style={{ 
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                color: statusTab === '' ? '#0f172a' : '#2563eb', fontWeight: statusTab === '' ? 700 : 500
              }}
            >
              Semua ({wooStats.total})
            </button>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <button 
              onClick={() => setStatusTab('active')} 
              style={{ 
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                color: statusTab === 'active' ? '#0f172a' : '#2563eb', fontWeight: statusTab === 'active' ? 700 : 500
              }}
            >
              Terbit ({wooStats.active})
            </button>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <button 
              onClick={() => setStatusTab('taken_down')} 
              style={{ 
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                color: statusTab === 'taken_down' ? '#0f172a' : '#2563eb', fontWeight: statusTab === 'taken_down' ? 700 : 500
              }}
            >
              Ditarik ({wooStats.takenDown})
            </button>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <button 
              onClick={() => setStatusTab('pending')} 
              style={{ 
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                color: statusTab === 'pending' ? '#0f172a' : '#2563eb', fontWeight: statusTab === 'pending' ? 700 : 500
              }}
            >
              Pending ({wooStats.pending})
            </button>
          </div>

          <div style={{ marginTop: 24, maxWidth: '100%', overflow: 'hidden' }}>
            <TablePanel loading={loading} toolbar={
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: 12 }}>
                  <span style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>Daftar Produk Master</span>
                  <Link to="/admin/products/add" className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <i className="bx bx-plus-circle" /> Tambah SKU Induk
                  </Link>
                </div>
                {filterBar}
              </div>
            }>
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
              <div className="wc-table-wrapper" style={{ overflowX: 'auto', width: '100%' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '100%', tableLayout: 'fixed' }}>
                  <thead>
                    <tr>
                      <th style={{ ...compTh, width: 35, paddingLeft: 10 }}>
                        <input 
                          type="checkbox" 
                          checked={paginatedProducts.length > 0 && paginatedProducts.every(p => selectedIds.includes(p.id))} 
                          onChange={() => {
                            const allSelected = paginatedProducts.every(p => selectedIds.includes(p.id));
                            if (allSelected) {
                              setSelectedIds(prev => prev.filter(id => !paginatedProducts.some(p => p.id === id)));
                            } else {
                              setSelectedIds(prev => [...new Set([...prev, ...paginatedProducts.map(p => p.id)])]);
                            }
                          }}
                          style={{ width: 16, height: 16, cursor: 'pointer' }}
                        />
                      </th>
                      <th style={{ ...compTh, width: 45, textAlign: 'center' }}>
                        <i className="bx bx-image" style={{ fontSize: 16 }} />
                      </th>
                      <th style={{ ...compTh, textAlign: 'left', cursor: 'pointer' }} onClick={() => { setSortBy('name'); setOrder(o => o === 'asc' ? 'desc' : 'asc'); }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          Nama
                          {sortBy === 'name' && <i className={`bx ${order === 'asc' ? 'bx-chevron-up' : 'bx-chevron-down'}`} style={{ color: '#6366f1', fontSize: 13 }} />}
                        </div>
                      </th>
                      <th style={{ ...compTh, textAlign: 'left', cursor: 'pointer', width: 85 }} onClick={() => { setSortBy('sku'); setOrder(o => o === 'asc' ? 'desc' : 'asc'); }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          SKU
                          {sortBy === 'sku' && <i className={`bx ${order === 'asc' ? 'bx-chevron-up' : 'bx-chevron-down'}`} style={{ color: '#6366f1', fontSize: 13 }} />}
                        </div>
                      </th>
                      <th style={{ ...compTh, textAlign: 'left', cursor: 'pointer', width: 85 }} onClick={() => { setSortBy('stock'); setOrder(o => o === 'asc' ? 'desc' : 'asc'); }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          Stok
                          {sortBy === 'stock' && <i className={`bx ${order === 'asc' ? 'bx-chevron-up' : 'bx-chevron-down'}`} style={{ color: '#6366f1', fontSize: 13 }} />}
                        </div>
                      </th>
                      <th style={{ ...compTh, textAlign: 'left', cursor: 'pointer', width: 90 }} onClick={() => { setSortBy('price'); setOrder(o => o === 'asc' ? 'desc' : 'asc'); }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          Harga
                          {sortBy === 'price' && <i className={`bx ${order === 'asc' ? 'bx-chevron-up' : 'bx-chevron-down'}`} style={{ color: '#6366f1', fontSize: 13 }} />}
                        </div>
                      </th>
                      <th style={{ ...compTh, textAlign: 'left', cursor: 'pointer', width: 90 }} onClick={() => { setSortBy('cogs'); setOrder(o => o === 'asc' ? 'desc' : 'asc'); }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          COGS
                          {sortBy === 'cogs' && <i className={`bx ${order === 'asc' ? 'bx-chevron-up' : 'bx-chevron-down'}`} style={{ color: '#6366f1', fontSize: 13 }} />}
                        </div>
                      </th>
                      <th style={{ ...compTh, textAlign: 'left', width: 100 }}>Kategori</th>
                      <th style={{ ...compTh, textAlign: 'left', width: 70 }}>Tag</th>
                      <th style={{ ...compTh, textAlign: 'center', width: 35 }}>
                        <i className="bx bx-star" title="Featured" style={{ fontSize: 15, color: '#f59e0b' }} />
                      </th>
                      <th style={{ ...compTh, textAlign: 'left', cursor: 'pointer', width: 95 }} onClick={() => { setSortBy('created_at'); setOrder(o => o === 'asc' ? 'desc' : 'asc'); }}>
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
                      <th style={{ ...compTh, textAlign: 'left', width: 80 }}>Brand</th>
                      <th style={{ ...compTh, textAlign: 'center', width: 45 }}>
                        <i className="bx bx-trash" title="Aksi" style={{ fontSize: 15 }} />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProducts.map((p, idx) => {
                      const isSelected = selectedIds.includes(p.id);
                      const isLast = idx === paginatedProducts.length - 1;
                      
                      // SEO calculations
                      const seo = getSeoScore(p);
                      const seoColor = seo === 'green' ? '#10b981' : seo === 'orange' ? '#f59e0b' : seo === 'red' ? '#ef4444' : '#cbd5e1';
                      
                      const read = getReadabilityScore(p);
                      const readColor = read === 'green' ? '#10b981' : read === 'orange' ? '#f59e0b' : read === 'red' ? '#ef4444' : '#cbd5e1';

                      const outbound = p.product_url ? 1 : 0;

                      return (
                        <tr key={p.id}
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
                          <td style={{ ...compTd(isLast), whiteSpace: 'normal', wordBreak: 'break-word', minWidth: 200 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <Link 
                                to={`/admin/products/edit?id=${p.id}`} 
                                style={{ fontSize: 13, fontWeight: 700, color: '#2563eb', textDecoration: 'none' }}
                                className="product-name-hover"
                              >
                                {p.name}
                              </Link>
                              <div style={{ 
                                display: 'flex', 
                                flexWrap: 'wrap',
                                gap: 6, 
                                marginTop: 4, 
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
                                  onClick={() => {
                                    setQuickEditProduct(p);
                                    setQuickEditData({ name: p.name, sku: p.sku || '', price: p.price || '', stock: p.stock || 0 });
                                  }} 
                                  style={{ background: 'none', border: 'none', padding: 0, color: '#2563eb', cursor: 'pointer', fontSize: 10.5, fontWeight: 600 }}
                                >
                                  Quick Edit
                                </button>
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
                            ) : p.stock > 0 ? (
                              <span style={{ fontSize: 12.5, color: '#16a34a', fontWeight: 700 }}>Tersedia ({p.stock})</span>
                            ) : (
                              <span style={{ fontSize: 12.5, color: '#dc2626', fontWeight: 700 }}>Habis (0)</span>
                            )}
                          </td>

                          {/* Price */}
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
                            ) : (
                              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1e293b' }}>{idr(p.price)}</span>
                            )}
                          </td>

                          {/* COGS next to retail price */}
                          <td style={{ ...compTd(isLast) }}>
                            <span style={{ fontSize: 12.5, color: '#64748b' }}>{idr(p.cogs)}</span>
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
                              <i className={`bx ${featuredIds.includes(p.id) ? 'bxs-star' : 'bx-star'}`} style={{ fontSize: 15, color: featuredIds.includes(p.id) ? '#f59e0b' : '#cbd5e1' }} />
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {!loading && filteredProducts.length > 0 && (
              <Pagination 
                currentPage={stockPage} 
                totalItems={filteredProducts.length} 
                pageSize={stockPageSize} 
                onPageChange={setStockPage} 
                onPageSizeChange={setStockPageSize} 
                label="produk" 
              />
            )}
            </TablePanel>
          </div>
        </>
      )}

      {activeTab === 'inbound' && (
        <TablePanel loading={loading} toolbar={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: 12 }}>
              <span style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>Riwayat Catatan Inbound</span>
              <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm" onClick={() => setShowInboundModal(true)}>
                <i className="bx bx-plus-circle" /> Catat Barang Datang
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
              <AdminSelect 
                style={filterSelectStyle} 
                value={bulkInboundAction} 
                onChange={e => setBulkInboundAction(e.target.value)}
              >
                <option value="">Tindakan massal</option>
                <option value="delete">Hapus</option>
              </AdminSelect>
              <button type="button" onClick={handleBulkInboundApply} style={filterButtonStyle}>
                Terapkan
              </button>
            </div>
          </div>
        }>
          {inbounds.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ width: 80, height: 80, background: '#f8fafc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <i className="bx bx-receipt" style={{ fontSize: 40, color: '#cbd5e1' }} />
              </div>
              <h3 style={{ margin: '0 0 8px 0', color: '#334155', fontSize: 16 }}>Belum Ada Inbound</h3>
              <p style={{ margin: 0, fontSize: 14 }}>Gunakan tombol di atas untuk mencatat barang masuk dari supplier.</p>
            </div>
          ) : (
            <>
              <div className="wc-table-wrapper" style={{ overflowX: 'auto', width: '100%' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                  <thead>
                    <tr>
                      <th style={{ ...A.th, width: 35, paddingLeft: 24 }}>
                        <input 
                          type="checkbox" 
                          checked={paginatedInbounds.length > 0 && paginatedInbounds.every(inb => selectedInboundIds.includes(inb.id))} 
                          onChange={() => {
                            const allSelected = paginatedInbounds.every(inb => selectedInboundIds.includes(inb.id));
                            if (allSelected) {
                              setSelectedInboundIds(prev => prev.filter(id => !paginatedInbounds.some(inb => inb.id === id)));
                            } else {
                              setSelectedInboundIds(prev => [...new Set([...prev, ...paginatedInbounds.map(inb => inb.id)])]);
                            }
                          }}
                          style={{ width: 16, height: 16, cursor: 'pointer', verticalAlign: 'middle' }}
                        />
                      </th>
                      {['Tanggal', 'No. Referensi', 'Supplier', 'Total Item', 'Catatan'].map((h, i) => (
                        <th key={h} style={{ ...A.th, paddingLeft: 16 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedInbounds.map((inb, i) => {
                      const isSelected = selectedInboundIds.includes(inb.id);
                      return (
                        <tr key={inb.id || i} className="hover-row" style={{ background: isSelected ? '#f5f7ff' : 'transparent' }}>
                          <td style={{ ...A.td, paddingLeft: 24, width: 35 }}>
                            <input 
                              type="checkbox" 
                              checked={isSelected} 
                              onChange={() => toggleInboundSelect(inb.id)}
                              style={{ width: 16, height: 16, cursor: 'pointer', verticalAlign: 'middle' }}
                            />
                          </td>
                          <td style={{ ...A.td, paddingLeft: 16 }}>{fmtDate(inb.created_at)}</td>
                          <td style={A.td}>
                            <span style={{ fontWeight: 800, color: '#6366f1', fontFamily: 'monospace' }}>
                              {inb.reference_no || '—'}
                            </span>
                          </td>
                          <td style={A.td}>
                            <div style={{ fontWeight: 700 }}>{inb.supplier?.name || '—'}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>{inb.supplier?.contact || ''}</div>
                          </td>
                          <td style={A.td}>
                            <span style={{ fontWeight: 800, color: '#0f172a' }}>{inb.total_items} item</span>
                          </td>
                          <td style={A.td}>
                            <span style={{ fontSize: 12.5, color: '#475569' }}>{inb.note || '—'}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={inboundPage}
                totalItems={inbounds.length}
                pageSize={inboundPageSize}
                onPageChange={setInboundPage}
                onPageSizeChange={setInboundPageSize}
                label="catatan inbound"
              />
            </>
          )}
        </TablePanel>
      )}

      {activeTab === 'suppliers' && (
        <TablePanel loading={loading} toolbar={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: 12 }}>
              <span style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>Daftar Supplier Mitra</span>
              <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm" onClick={() => setShowSupplierModal(true)}>
                <i className="bx bx-plus-circle" /> Tambah Supplier
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
              <AdminSelect 
                style={filterSelectStyle} 
                value={bulkSupplierAction} 
                onChange={e => setBulkSupplierAction(e.target.value)}
              >
                <option value="">Tindakan massal</option>
                <option value="delete">Hapus</option>
              </AdminSelect>
              <button type="button" onClick={handleBulkSupplierApply} style={filterButtonStyle}>
                Terapkan
              </button>
            </div>
          </div>
        }>
          {suppliers.length === 0 ? (
            <div className="text-center p-12 flex flex-col items-center gap-3">Belum ada data supplier terdaftar.</div>
          ) : (
            <>
              <div className="wc-table-wrapper" style={{ overflowX: 'auto', width: '100%' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                  <thead>
                    <tr>
                      <th style={{ ...A.th, width: 35, paddingLeft: 24 }}>
                        <input 
                          type="checkbox" 
                          checked={paginatedSuppliers.length > 0 && paginatedSuppliers.every(s => selectedSupplierIds.includes(s.id))} 
                          onChange={() => {
                            const allSelected = paginatedSuppliers.every(s => selectedSupplierIds.includes(s.id));
                            if (allSelected) {
                              setSelectedSupplierIds(prev => prev.filter(id => !paginatedSuppliers.some(s => s.id === id)));
                            } else {
                              setSelectedSupplierIds(prev => [...new Set([...prev, ...paginatedSuppliers.map(s => s.id)])]);
                            }
                          }}
                          style={{ width: 16, height: 16, cursor: 'pointer', verticalAlign: 'middle' }}
                        />
                      </th>
                      {['Nama Perusahaan', 'Kontak', 'Email', 'Alamat', ''].map((h, i) => <th key={h} style={{ ...A.th, paddingLeft: 16 }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSuppliers.map((s, i) => {
                      const isSelected = selectedSupplierIds.includes(s.id);
                      return (
                        <tr key={s.id || i} className="hover-row" style={{ background: isSelected ? '#f5f7ff' : 'transparent' }}>
                          <td style={{ ...A.td, paddingLeft: 24, width: 35 }}>
                            <input 
                              type="checkbox" 
                              checked={isSelected} 
                              onChange={() => toggleSupplierSelect(s.id)}
                              style={{ width: 16, height: 16, cursor: 'pointer', verticalAlign: 'middle' }}
                            />
                          </td>
                          <td style={{ ...A.td, paddingLeft: 16 }}>
                            <div style={{ fontWeight: 800, color: '#0f172a' }}>{s.name}</div>
                          </td>
                          <td style={A.td}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{s.contact || '-'}</div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>{s.phone || '-'}</div>
                          </td>
                          <td style={A.td}><span style={{ color: '#6366f1' }}>{s.email || '-'}</span></td>
                          <td style={A.td}>
                            <span style={{ fontSize: 12, color: '#475569', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {s.address || '-'}
                            </span>
                          </td>
                          <td style={{ ...A.td, paddingRight: 24, textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: 8 }}>
                              <button style={A.iconBtn('#6366f1')} onClick={() => handleEditSupplier(s)}><i className="bx bx-edit-alt" /></button>
                              <button style={A.iconBtn('#ef4444', '#fef2f2')} onClick={() => handleDeleteSupplier(s.id)}><i className="bx bx-trash" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={supplierPage}
                totalItems={suppliers.length}
                pageSize={supplierPageSize}
                onPageChange={setSupplierPage}
                onPageSizeChange={setSupplierPageSize}
                label="supplier terdaftar"
              />
            </>
          )}
        </TablePanel>
      )}

      {activeTab === 'audit' && (
        <TablePanel loading={loading} toolbar={<div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>Global Mutation Log</div>}>
          {mutations.length === 0 ? (
            <div className="text-center p-12 flex flex-col items-center gap-3">Belum ada riwayat pergerakan stok.</div>
          ) : (
            <>
              <div className="wc-table-wrapper" style={{ overflowX: 'auto', width: '100%' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                  <thead>
                    <tr>{['Waktu', 'Tipe', 'Produk', 'Mutasi', 'Before', 'After', 'Keterangan'].map((h, i) => <th key={h} style={{ ...A.th, paddingLeft: i===0?24:16 }}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {paginatedMutations.map((m, i) => (
                      <tr key={m.id || i} className="hover-row" style={{ borderBottom: '1px solid #f8fafc' }}>
                        <td style={{ ...A.td, paddingLeft: 24, whiteSpace: 'nowrap' }}>{fmtDate(m.created_at)}</td>
                        <td style={A.td}>
                          <span style={{ 
                            padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                            background: m.type === 'IN' || m.type === 'RESTOCK_IN' ? '#ecfdf5' : '#fff1f2',
                            color: m.type === 'IN' || m.type === 'RESTOCK_IN' ? '#10b981' : '#f43f5e'
                          }}>{m.type}</span>
                        </td>
                        <td style={A.td}>
                          <span style={{ fontWeight: 700, color: '#334155' }}>
                            {products.find(p => p.id === m.product_id)?.name || 'Unknown'}
                          </span>
                        </td>
                        <td style={A.td}>
                          <span style={{ 
                            fontWeight: 800, fontSize: 14,
                            color: m.quantity > 0 ? '#10b981' : '#f43f5e' 
                          }}>
                            {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                          </span>
                        </td>
                        <td style={A.td}><span style={{ color: '#94a3b8' }}>{m.stock_before}</span></td>
                        <td style={A.td}><b style={{ color: '#0f172a' }}>{m.stock_after}</b></td>
                        <td style={{ ...A.td, paddingRight: 24 }}>
                          <span style={{ fontSize: 12, color: '#64748b', background: '#f1f5f9', padding: '4px 8px', borderRadius: 6 }}>
                            {m.note || '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={auditPage}
                totalItems={mutations.length}
                pageSize={auditPageSize}
                onPageChange={setAuditPage}
                onPageSizeChange={setAuditPageSize}
                label="riwayat mutasi stok"
              />
            </>
          )}
        </TablePanel>
      )}

      {/* ── MODAL: INBOUND STOCK ── */}
      {showInboundModal && (
        <Modal title="Catat Inbound Stock" wide onClose={() => setShowInboundModal(false)}>
          <form onSubmit={handleInboundSubmit}>
            <div className="responsive-grid" style={{ marginBottom: 24 }}>
              <div>
                <FieldLabel>Pilih Supplier</FieldLabel>
                <AdminSelect 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400" style={{ width: '100%' }} 
                  value={inboundForm.supplier_id} 
                  onChange={e => setInboundForm({...inboundForm, supplier_id: e.target.value})}
                >
                  <option value="">-- Pilih Supplier --</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </AdminSelect>
              </div>
              <div>
                <FieldLabel>No. Surat Jalan / Referensi</FieldLabel>
                <input 
                  type="text" placeholder="MISAL: SJ/2026/001" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400"
                  value={inboundForm.reference_no} 
                  onChange={e => setInboundForm({...inboundForm, reference_no: e.target.value})}
                />
              </div>
            </div>

            <div style={{ marginBottom: 30 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                <h4 style={{ margin: 0, fontSize: 14, color: '#0f172a' }}>Daftar Produk Masuk</h4>
                <button type="button" onClick={addInboundItem} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm" style={{ padding: '6px 12px', fontSize: 11 }}>
                  + Tambah Baris
                </button>
              </div>
              
              <div style={{ maxHeight: 300, overflowY: 'auto', paddingRight: 8 }}>
                {inboundForm.items.map((item, idx) => (
                  <div key={idx} className="inbound-row">
                    <div>
                      <FieldLabel>Produk</FieldLabel>
                      <AdminSelect className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400" style={{ width: '100%' }} value={item.product_id} onChange={e => updateInboundItem(idx, 'product_id', e.target.value)}>
                        <option value="">Pilih Produk Master</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                      </AdminSelect>
                    </div>
                    <div>
                      <FieldLabel>Kuantitas</FieldLabel>
                      <input type="number" placeholder="Qty" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400" value={item.quantity} onChange={e => updateInboundItem(idx, 'quantity', e.target.value)} />
                    </div>
                    <div>
                      <FieldLabel>Harga Beli (Satuan)</FieldLabel>
                      <input type="number" placeholder="Harga Beli" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400" value={item.cost_price} onChange={e => updateInboundItem(idx, 'cost_price', e.target.value)} />
                    </div>
                    {inboundForm.items.length > 1 && (
                      <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%', paddingBottom: 4 }}>
                        <button 
                          type="button" 
                          style={A.iconBtn('#ef4444', '#fef2f2')} 
                          onClick={() => setInboundForm({ ...inboundForm, items: inboundForm.items.filter((_, i) => i !== idx) })}
                        >
                          <i className="bx bx-trash" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
              <button type="button" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm" onClick={() => setShowInboundModal(false)}>Batal</button>
              <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"><i className="bx bx-check-circle" /> Simpan & Update Stok</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL: ADD SUPPLIER ── */}
      {showSupplierModal && (
        <Modal title={supplierForm.id ? 'Edit Supplier' : 'Tambah Supplier Baru'} onClose={() => setShowSupplierModal(false)}>
          <form onSubmit={handleSupplierSubmit}>
            <div style={{ marginBottom: 20 }}>
              <FieldLabel>Nama Perusahaan</FieldLabel>
              <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400" placeholder="PT Contoh Maju Bersama" value={supplierForm.name} onChange={e => setSupplierForm({...supplierForm, name: e.target.value})} required />
            </div>
            
            <div className="responsive-grid" style={{ marginBottom: 20 }}>
              <div>
                <FieldLabel>Nama Kontak (PIC)</FieldLabel>
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400" placeholder="Budi Santoso" value={supplierForm.contact} onChange={e => setSupplierForm({...supplierForm, contact: e.target.value})} />
              </div>
              <div>
                <FieldLabel>No. Telepon / WhatsApp</FieldLabel>
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400" placeholder="08123456789" value={supplierForm.phone} onChange={e => setSupplierForm({...supplierForm, phone: e.target.value})} />
              </div>
            </div>
            
            <div style={{ marginBottom: 20 }}>
              <FieldLabel>Email Resmi</FieldLabel>
              <input type="email" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400" placeholder="info@perusahaan.com" value={supplierForm.email} onChange={e => setSupplierForm({...supplierForm, email: e.target.value})} />
            </div>
            
            <div style={{ marginBottom: 30 }}>
              <FieldLabel>Alamat Lengkap</FieldLabel>
              <textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-indigo-400 transition-all resize-y placeholder:text-slate-400" style={{ height: 100 }} placeholder="Jl. Contoh No. 123..." value={supplierForm.address} onChange={e => setSupplierForm({...supplierForm, address: e.target.value})} />
            </div>
            
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
              <button type="button" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm" onClick={() => setShowSupplierModal(false)}>Batal</button>
              <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"><i className="bx bx-save" /> {supplierForm.id ? 'Simpan Perubahan' : 'Daftarkan Supplier'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Barcode */}
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
              <img 
                src={`https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(showQR.sku || String(showQR.id))}&code=Code128&dpi=96&translate-esc=on`} 
                alt={showQR.sku || String(showQR.id)} 
                style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
              />
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

      {/* Modal: Quick Edit */}
      {quickEditProduct && (
        <Modal title="Quick Edit" onClose={() => setQuickEditProduct(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
            <div>
              <FieldLabel>Nama Produk</FieldLabel>
              <input 
                type="text" 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400" 
                value={quickEditData.name} 
                onChange={e => setQuickEditData({ ...quickEditData, name: e.target.value })} 
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <FieldLabel>SKU</FieldLabel>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400" 
                  value={quickEditData.sku} 
                  onChange={e => setQuickEditData({ ...quickEditData, sku: e.target.value })} 
                />
              </div>
              <div>
                <FieldLabel>Stok</FieldLabel>
                <input 
                  type="number" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400" 
                  value={quickEditData.stock} 
                  onChange={e => setQuickEditData({ ...quickEditData, stock: e.target.value })} 
                />
              </div>
            </div>
            <div>
              <FieldLabel>Harga Jual (Rp)</FieldLabel>
              <input 
                type="number" 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400" 
                value={quickEditData.price} 
                onChange={e => setQuickEditData({ ...quickEditData, price: e.target.value })} 
              />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button 
                onClick={handleQuickEditSave} 
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm" style={{ flex: 1, justifyContent: 'center', height: 40 }}
              >
                Simpan Perubahan
              </button>
              <button 
                onClick={() => setQuickEditProduct(null)} 
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm" style={{ flex: 1, justifyContent: 'center', height: 40 }}
              >
                Batal
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

const fLabel = { display: 'block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#64748b', marginBottom: 8 };
const fInput = {
  width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #e2e8f0', outline: 'none', fontSize: 13, transition: 'all 0.2s', background: '#f8fafc'
};
