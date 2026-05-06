import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchJson, postJson, ADMIN_API_BASE, formatImage } from '../../lib/api';
import { PageHeader, StatRow, TablePanel, statusBadge, idr, fmtDate, A, Modal, FieldLabel } from '../../lib/adminStyles.jsx';
import toast from 'react-hot-toast';

export default function PusatInventory() {
  const [activeTab, setActiveTab] = useState('stock'); // stock, inbound, suppliers, audit
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [inbounds, setInbounds] = useState([]);
  const [mutations, setMutations] = useState([]);
  const [stats, setStats] = useState({ totalItems: 0, totalValue: 0, lowStock: 0 });

  const loadAllData = async () => {
    setLoading(true);
    try {
      // 1. Load Products
      const prodData = await fetchJson(`${ADMIN_API_BASE}/products`);
      console.log("DEBUG: Pusat Inventory Data Raw ->", prodData);
      const pList = Array.isArray(prodData) ? prodData : (prodData?.data || []);
      console.log("DEBUG: Processed Product List ->", pList);
      setProducts(pList);

      // 2. Load Suppliers
      const supData = await fetchJson(`${ADMIN_API_BASE}/warehouse/suppliers`);
      setSuppliers(Array.isArray(supData) ? supData : []);

      // 3. Load Audit Log (Mata Elang)
      const mutData = await fetchJson(`${ADMIN_API_BASE}/warehouse/stock-history`);
      setMutations(Array.isArray(mutData) ? mutData : []);

      // Stats
      const totalItems = pList.reduce((acc, p) => acc + (p.stock || 0), 0);
      const totalValue = pList.reduce((acc, p) => acc + ((p.stock || 0) * (p.price || 0)), 0);
      const lowStock = pList.filter(p => p.stock < 10).length;
      setStats({ totalItems, totalValue, lowStock });

    } catch (err) {
      console.error("Warehouse Sync Error:", err);
      toast.error('Gagal sinkronisasi data gudang');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

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

  const handlePrintBarcode = () => {
    if (products.length === 0) return toast.error('Belum ada produk master untuk dicetak');
    
    const htmlContent = `
      <html>
        <head>
          <title>Cetak Barcode Master</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 20px; display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; }
            .barcode-card { border: 1px dashed #ccc; padding: 15px; text-align: center; border-radius: 8px; }
            .barcode-card img { max-width: 100%; height: auto; margin-bottom: 10px; }
            .title { font-size: 12px; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 5px; }
            .sku { font-size: 10px; color: #666; }
            @media print { body { padding: 0; } .barcode-card { break-inside: avoid; border: 1px solid #000; } }
          </style>
        </head>
        <body onload="setTimeout(() => window.print(), 1000)">
          ${products.map(p => `
            <div class="barcode-card">
              <div class="title">${p.name}</div>
              <img src="https://barcode.tec-it.com/barcode.ashx?data=${p.sku}&code=Code128&dpi=96&translate-esc=on" alt="${p.sku}" />
              <div class="sku">${p.sku}</div>
            </div>
          `).join('')}
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
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
    } catch (err) {
      toast.error(err.message);
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
    } catch (err) {
      toast.error(err.message);
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
    } catch (err) {
      toast.error('Gagal menghapus supplier: ' + err.message);
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
          <button style={A.btnGhost} onClick={loadAllData}><i className="bx bx-refresh" /> Sync Global</button>
          <button style={A.btnPrimary} onClick={handlePrintBarcode}>
            <i className="bx bx-barcode-reader" /> Cetak Barcode Master
          </button>
        </div>
      </PageHeader>

      <div className="tab-container">
        <div className={`tab-item ${activeTab === 'stock' ? 'active' : ''}`} onClick={() => setActiveTab('stock')}>📦 Stok Master</div>
        <div className={`tab-item ${activeTab === 'inbound' ? 'active' : ''}`} onClick={() => setActiveTab('inbound')}>🚚 Inbound (Masuk)</div>
        <div className={`tab-item ${activeTab === 'suppliers' ? 'active' : ''}`} onClick={() => setActiveTab('suppliers')}>🏭 Supplier</div>
        <div className={`tab-item ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => setActiveTab('audit')}>👁️ Mata Elang</div>
      </div>

      {activeTab === 'stock' && (
        <>
          <StatRow stats={[
            { label: 'Stock On-Hand', val: stats.totalItems, icon: 'bxs-box', color: '#6366f1' },
            { label: 'Valuasi Inventori', val: idr(stats.totalValue), icon: 'bxs-badge-dollar', color: '#10b981' },
            { label: 'SKU Kritis', val: stats.lowStock, icon: 'bxs-error-circle', color: '#ef4444' },
          ]} />
          
          <div style={{ marginTop: 24 }}>
            <TablePanel loading={loading} toolbar={
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'space-between', width: '100%' }}>
                <span style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>Daftar Produk Master</span>
                <Link to="/admin/products/add" style={{ ...A.btnPrimary, textDecoration: 'none' }}>
                  <i className="bx bx-plus-circle" /> Tambah SKU Induk
                </Link>
              </div>
            }>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                <thead>
                  <tr>
                    {['Produk', 'SKU', 'Stok', 'Harga Ritel', 'Harga Merchant', 'COGS', ''].map((h, i) => (
                      <th key={i} style={{ ...A.th, paddingLeft: i === 0 ? 24 : 16 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr><td colSpan="7" style={A.empty}>Belum ada data produk master.</td></tr>
                  ) : products.map((p, i) => (
                    <tr key={i} className="hover-row" style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ ...A.td, paddingLeft: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <img 
                            src={formatImage(p.image)} 
                            style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', border: '1px solid #e2e8f0' }} 
                            alt=""
                            onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name || 'P')}&background=eef2ff&color=6366f1&size=80&font-size=0.45&bold=true`; }}
                          />
                          <div>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 13.5 }}>{p.name}</div>
                          </div>
                        </div>
                      </td>
                      <td style={A.td}>
                        <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 6, fontSize: 11, fontFamily: 'monospace', fontWeight: 600 }}>
                          {p.sku || '-'}
                        </span>
                      </td>
                      <td style={A.td}>
                        <span style={{ 
                          fontWeight: 800, 
                          color: p.stock < 10 ? '#ef4444' : '#10b981',
                          background: p.stock < 10 ? '#fef2f2' : '#ecfdf5',
                          padding: '4px 10px', borderRadius: 20, fontSize: 12
                        }}>
                          {p.stock}
                        </span>
                      </td>
                      <td style={A.td}><span style={{ fontWeight: 600 }}>{idr(p.price)}</span></td>
                      <td style={A.td}><span style={{ color: '#6366f1', fontWeight: 800 }}>{idr(p.wholesale_price || (p.price * 0.8))}</span></td>
                      <td style={A.td}><span style={{ color: '#64748b' }}>{idr(p.cogs)}</span></td>
                      <td style={{ ...A.td, textAlign: 'right', paddingRight: 24 }} className="action-td">
                        <Link to={`/admin/products/edit?id=${p.id}`} className="bx bx-edit-alt" style={{ fontSize: 20, color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#6366f1'} onMouseLeave={e => e.target.style.color = '#94a3b8'}></Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TablePanel>
          </div>
        </>
      )}

      {activeTab === 'inbound' && (
        <TablePanel loading={loading} toolbar={<button style={A.btnPrimary} onClick={() => setShowInboundModal(true)}>+ Catat Barang Datang</button>}>
           <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ width: 80, height: 80, background: '#f8fafc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <i className="bx bx-receipt" style={{ fontSize: 40, color: '#cbd5e1' }} />
              </div>
              <h3 style={{ margin: '0 0 8px 0', color: '#334155', fontSize: 16 }}>Belum Ada Inbound</h3>
              <p style={{ margin: 0, fontSize: 14 }}>Gunakan tombol di atas untuk mencatat barang masuk dari supplier.</p>
           </div>
        </TablePanel>
      )}

      {activeTab === 'suppliers' && (
        <TablePanel loading={loading} toolbar={<button style={A.btnPrimary} onClick={() => setShowSupplierModal(true)}>+ Tambah Supplier</button>}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr>{['Nama Perusahaan', 'Kontak', 'Email', 'Alamat', ''].map((h, i) => <th key={h} style={{ ...A.th, paddingLeft: i===0?24:16 }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {suppliers.length === 0 ? (
                <tr><td colSpan={5} style={A.empty}>Belum ada data supplier terdaftar.</td></tr>
              ) : suppliers.map((s, i) => (
                <tr key={i} className="hover-row">
                  <td style={{ ...A.td, paddingLeft: 24 }}>
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
              ))}
            </tbody>
          </table>
        </TablePanel>
      )}

      {activeTab === 'audit' && (
        <TablePanel loading={loading} toolbar={<div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>Global Mutation Log</div>}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr>{['Waktu', 'Tipe', 'Produk', 'Mutasi', 'Before', 'After', 'Keterangan'].map((h, i) => <th key={h} style={{ ...A.th, paddingLeft: i===0?24:16 }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {mutations.length === 0 ? (
                <tr><td colSpan="7" style={A.empty}>Belum ada riwayat pergerakan stok.</td></tr>
              ) : mutations.map((m, i) => (
                <tr key={i} className="hover-row" style={{ borderBottom: '1px solid #f8fafc' }}>
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
        </TablePanel>
      )}

      {/* ── MODAL: INBOUND STOCK ── */}
      {showInboundModal && (
        <Modal title="Catat Inbound Stock" wide onClose={() => setShowInboundModal(false)}>
          <form onSubmit={handleInboundSubmit}>
            <div className="responsive-grid" style={{ marginBottom: 24 }}>
              <div>
                <FieldLabel>Pilih Supplier</FieldLabel>
                <select 
                  style={{ ...A.select, width: '100%' }} 
                  value={inboundForm.supplier_id} 
                  onChange={e => setInboundForm({...inboundForm, supplier_id: e.target.value})}
                >
                  <option value="">-- Pilih Supplier --</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel>No. Surat Jalan / Referensi</FieldLabel>
                <input 
                  type="text" placeholder="MISAL: SJ/2026/001" style={A.input}
                  value={inboundForm.reference_no} 
                  onChange={e => setInboundForm({...inboundForm, reference_no: e.target.value})}
                />
              </div>
            </div>

            <div style={{ marginBottom: 30 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                <h4 style={{ margin: 0, fontSize: 14, color: '#0f172a' }}>Daftar Produk Masuk</h4>
                <button type="button" onClick={addInboundItem} style={{ ...A.btnGhost, padding: '6px 12px', fontSize: 11 }}>
                  + Tambah Baris
                </button>
              </div>
              
              <div style={{ maxHeight: 300, overflowY: 'auto', paddingRight: 8 }}>
                {inboundForm.items.map((item, idx) => (
                  <div key={idx} className="inbound-row">
                    <div>
                      <FieldLabel>Produk</FieldLabel>
                      <select style={{ ...A.select, width: '100%' }} value={item.product_id} onChange={e => updateInboundItem(idx, 'product_id', e.target.value)}>
                        <option value="">Pilih Produk Master</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                      </select>
                    </div>
                    <div>
                      <FieldLabel>Kuantitas</FieldLabel>
                      <input type="number" placeholder="Qty" style={A.input} value={item.quantity} onChange={e => updateInboundItem(idx, 'quantity', e.target.value)} />
                    </div>
                    <div>
                      <FieldLabel>Harga Beli (Satuan)</FieldLabel>
                      <input type="number" placeholder="Harga Beli" style={A.input} value={item.cost_price} onChange={e => updateInboundItem(idx, 'cost_price', e.target.value)} />
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
              <button type="button" style={A.btnGhost} onClick={() => setShowInboundModal(false)}>Batal</button>
              <button type="submit" style={A.btnPrimary}><i className="bx bx-check-circle" /> Simpan & Update Stok</button>
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
              <input type="text" style={A.input} placeholder="PT Contoh Maju Bersama" value={supplierForm.name} onChange={e => setSupplierForm({...supplierForm, name: e.target.value})} required />
            </div>
            
            <div className="responsive-grid" style={{ marginBottom: 20 }}>
              <div>
                <FieldLabel>Nama Kontak (PIC)</FieldLabel>
                <input type="text" style={A.input} placeholder="Budi Santoso" value={supplierForm.contact} onChange={e => setSupplierForm({...supplierForm, contact: e.target.value})} />
              </div>
              <div>
                <FieldLabel>No. Telepon / WhatsApp</FieldLabel>
                <input type="text" style={A.input} placeholder="08123456789" value={supplierForm.phone} onChange={e => setSupplierForm({...supplierForm, phone: e.target.value})} />
              </div>
            </div>
            
            <div style={{ marginBottom: 20 }}>
              <FieldLabel>Email Resmi</FieldLabel>
              <input type="email" style={A.input} placeholder="info@perusahaan.com" value={supplierForm.email} onChange={e => setSupplierForm({...supplierForm, email: e.target.value})} />
            </div>
            
            <div style={{ marginBottom: 30 }}>
              <FieldLabel>Alamat Lengkap</FieldLabel>
              <textarea style={{...A.textarea, height: 100}} placeholder="Jl. Contoh No. 123..." value={supplierForm.address} onChange={e => setSupplierForm({...supplierForm, address: e.target.value})} />
            </div>
            
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
              <button type="button" style={A.btnGhost} onClick={() => setShowSupplierModal(false)}>Batal</button>
              <button type="submit" style={A.btnPrimary}><i className="bx bx-save" /> {supplierForm.id ? 'Simpan Perubahan' : 'Daftarkan Supplier'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

const fLabel = { display: 'block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#64748b', marginBottom: 8 };
const fInput = {
  width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #e2e8f0', outline: 'none', fontSize: 13, transition: 'all 0.2s', background: '#f8fafc'
};
