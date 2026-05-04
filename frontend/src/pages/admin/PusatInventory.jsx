import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchJson, postJson, ADMIN_API_BASE, formatImage } from '../../lib/api';
import { PageHeader, StatRow, TablePanel, statusBadge, idr, fmtDate, A } from '../../lib/adminStyles.jsx';
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
    <div style={A.page} className="fade-in">
      <PageHeader 
        title="Gudang Pusat (Command Center)" 
        subtitle="Otoritas tertinggi stok AkuGlow. Kelola amunisi barang dan pantau mutasi secara real-time."
      >
        <div style={{ display: 'flex', gap: 12 }}>
          <button style={A.btnGhost} onClick={loadAllData}><i className="bx bx-refresh" /> Sync Global</button>
          <button style={A.btnPrimary} onClick={handlePrintBarcode}>
            <i className="bx bx-barcode-reader" /> Cetak Barcode Master
          </button>
        </div>
      </PageHeader>

      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e2e8f0', marginBottom: 24, background: '#fff', borderRadius: '12px 12px 0 0', padding: '0 12px' }}>
        <div style={tabStyle('stock')} onClick={() => setActiveTab('stock')}>📦 Stok Master</div>
        <div style={tabStyle('inbound')} onClick={() => setActiveTab('inbound')}>🚚 Inbound (Barang Masuk)</div>
        <div style={tabStyle('suppliers')} onClick={() => setActiveTab('suppliers')}>🏭 Supplier</div>
        <div style={tabStyle('audit')} onClick={() => setActiveTab('audit')}>👁️ Mata Elang (Audit Log)</div>
      </div>

      {activeTab === 'stock' && (
        <>
          <StatRow stats={[
            { label: 'Stock On-Hand (Pusat)', val: stats.totalItems, icon: 'bxs-box', color: '#6366f1' },
            { label: 'Valuasi Inventori', val: idr(stats.totalValue), icon: 'bxs-badge-dollar', color: '#10b981' },
            { label: 'SKU Kritis', val: stats.lowStock, icon: 'bxs-error-circle', color: '#ef4444' },
          ]} />
          
          <TablePanel loading={loading} toolbar={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>Daftar Produk Master</span>
              <Link to="/admin/products/add" style={{ ...A.btnPrimary, textDecoration: 'none' }}>+ Tambah SKU Induk</Link>
            </div>
          }>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ ...A.td, paddingLeft: 24 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <img src={formatImage(p.image)} style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }} alt="" />
                        <div style={{ fontWeight: 700 }}>{p.name}</div>
                      </div>
                    </td>
                    <td style={A.td}><code style={{ fontSize: 11 }}>{p.sku}</code></td>
                    <td style={A.td}><b>{p.stock}</b></td>
                    <td style={A.td}>{idr(p.price)}</td>
                    <td style={A.td}><span style={{ color: '#6366f1', fontWeight: 700 }}>{idr(p.wholesale_price || (p.price * 0.8))}</span></td>
                    <td style={A.td}>{idr(p.cogs)}</td>
                    <td style={{ ...A.td, textAlign: 'right', paddingRight: 24 }}>
                      <Link to={`/admin/products/edit?id=${p.id}`} className="bx bx-edit-alt" style={{ fontSize: 18, color: '#64748b' }}></Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TablePanel>
        </>
      )}

      {activeTab === 'inbound' && (
        <TablePanel loading={loading} toolbar={<button style={A.btnPrimary} onClick={() => setShowInboundModal(true)}>+ Catat Barang Datang (Supplier)</button>}>
           <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
              <i className="bx bx-receipt" style={{ fontSize: 48, marginBottom: 12, display: 'block' }} />
              Belum ada riwayat penerimaan barang hari ini.<br/>
              Gunakan tombol di atas untuk mencatat barang masuk dari supplier.
           </div>
        </TablePanel>
      )}

      {activeTab === 'suppliers' && (
        <TablePanel loading={loading} toolbar={<button style={A.btnPrimary} onClick={() => setShowSupplierModal(true)}>+ Tambah Supplier Baru</button>}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['Nama Perusahaan', 'Kontak', 'Email', 'Alamat', ''].map(h => <th key={h} style={A.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {suppliers.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center' }}>Belum ada data supplier.</td></tr>
              ) : suppliers.map((s, i) => (
                <tr key={i}>
                  <td style={A.td}><b>{s.name}</b></td>
                  <td style={A.td}>{s.contact}</td>
                  <td style={A.td}>{s.email}</td>
                  <td style={A.td}>{s.address}</td>
                  <td style={A.td}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <i className="bx bx-edit-alt" style={{ cursor: 'pointer', fontSize: 18, color: '#6366f1' }} onClick={() => handleEditSupplier(s)} />
                      <i className="bx bx-trash" style={{ cursor: 'pointer', fontSize: 18, color: '#ef4444' }} onClick={() => handleDeleteSupplier(s.id)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TablePanel>
      )}

      {activeTab === 'audit' && (
        <TablePanel loading={loading} toolbar={<div style={{ fontWeight: 700 }}>Stock Mutation Log (Global)</div>}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['Waktu', 'Tipe', 'Produk', 'Qty', 'Before', 'After', 'Keterangan'].map(h => <th key={h} style={A.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {mutations.length === 0 ? (
                <tr><td colSpan="7" style={A.empty}>Belum ada riwayat mutasi stok.</td></tr>
              ) : mutations.map((m, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={A.td}>{fmtDate(m.created_at)}</td>
                  <td style={A.td}>
                    <span style={{ 
                      padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800,
                      background: m.type === 'IN' || m.type === 'RESTOCK_IN' ? '#ecfdf5' : '#fff1f2',
                      color: m.type === 'IN' || m.type === 'RESTOCK_IN' ? '#10b981' : '#f43f5e'
                    }}>{m.type}</span>
                  </td>
                  <td style={A.td}>{products.find(p => p.id === m.product_id)?.name || 'Unknown'}</td>
                  <td style={A.td}><b>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</b></td>
                  <td style={A.td}>{m.stock_before}</td>
                  <td style={A.td}><b>{m.stock_after}</b></td>
                  <td style={A.td}><span style={{ fontSize: 11, color: '#64748b' }}>{m.note}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </TablePanel>
      )}

      {/* ── MODAL: INBOUND STOCK ── */}
      {showInboundModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: 700, borderRadius: 20, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '24px 32px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontWeight: 800 }}>🚚 Catat Inbound Stock</h3>
              <button onClick={() => setShowInboundModal(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>×</button>
            </div>
            <form onSubmit={handleInboundSubmit} style={{ padding: 32 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                <div>
                  <label style={fLabel}>Supplier</label>
                  <select 
                    style={fInput} 
                    value={inboundForm.supplier_id} 
                    onChange={e => setInboundForm({...inboundForm, supplier_id: e.target.value})}
                  >
                    <option value="">Pilih Supplier</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={fLabel}>No. Surat Jalan / Ref</label>
                  <input 
                    type="text" placeholder="MISAL: SJ/2026/001" style={fInput}
                    value={inboundForm.reference_no} 
                    onChange={e => setInboundForm({...inboundForm, reference_no: e.target.value})}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <label style={fLabel}>Daftar Produk Masuk</label>
                  <button type="button" onClick={addInboundItem} style={{ fontSize: 11, color: '#6366f1', fontWeight: 800, background: 'none', border: 'none', cursor: 'pointer' }}>+ Baris Baru</button>
                </div>
                <div style={{ maxHeight: 250, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
                  {inboundForm.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr', gap: 12, marginBottom: 12 }}>
                      <select style={fInput} value={item.product_id} onChange={e => updateInboundItem(idx, 'product_id', e.target.value)}>
                        <option value="">Pilih Produk</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                      </select>
                      <input type="number" placeholder="Qty" style={fInput} value={item.quantity} onChange={e => updateInboundItem(idx, 'quantity', e.target.value)} />
                      <input type="number" placeholder="Harga Beli" style={fInput} value={item.cost_price} onChange={e => updateInboundItem(idx, 'cost_price', e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" style={A.btnGhost} onClick={() => setShowInboundModal(false)}>Batal</button>
                <button type="submit" style={A.btnPrimary}>Simpan & Update Stok</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD SUPPLIER ── */}
      {showSupplierModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: 500, borderRadius: 20, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '24px 32px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontWeight: 800 }}>{supplierForm.id ? '🏭 Edit Supplier' : '🏭 Tambah Supplier Baru'}</h3>
              <button onClick={() => setShowSupplierModal(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>×</button>
            </div>
            <form onSubmit={handleSupplierSubmit} style={{ padding: 32 }}>
              <div style={{ marginBottom: 20 }}>
                <label style={fLabel}>Nama Perusahaan</label>
                <input type="text" style={fInput} value={supplierForm.name} onChange={e => setSupplierForm({...supplierForm, name: e.target.value})} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={fLabel}>Nama Kontak</label>
                  <input type="text" style={fInput} value={supplierForm.contact} onChange={e => setSupplierForm({...supplierForm, contact: e.target.value})} />
                </div>
                <div>
                  <label style={fLabel}>No. Telepon</label>
                  <input type="text" style={fInput} value={supplierForm.phone} onChange={e => setSupplierForm({...supplierForm, phone: e.target.value})} />
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={fLabel}>Email</label>
                <input type="email" style={fInput} value={supplierForm.email} onChange={e => setSupplierForm({...supplierForm, email: e.target.value})} />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={fLabel}>Alamat</label>
                <textarea style={{...fInput, height: 80}} value={supplierForm.address} onChange={e => setSupplierForm({...supplierForm, address: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" style={A.btnGhost} onClick={() => setShowSupplierModal(false)}>Batal</button>
                <button type="submit" style={A.btnPrimary}>{supplierForm.id ? 'Simpan Perubahan' : 'Daftarkan Supplier'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const fLabel = { display: 'block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#64748b', marginBottom: 8 };
const fInput = {
  width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #e2e8f0', outline: 'none', fontSize: 13, transition: 'all 0.2s', background: '#f8fafc'
};
