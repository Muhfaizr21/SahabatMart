import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ADMIN_API_BASE, fetchJson, formatImage } from '../../lib/api';
import { PageHeader, TablePanel, Modal, FieldLabel, idr, A } from '../../lib/adminStyles.jsx';

const API = ADMIN_API_BASE;

export default function AdminCommissions() {
  const [categories, setCategories] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [catComms, setCatComms] = useState([]);
  const [merchComms, setMerchComms] = useState([]);
  const [presets, setPresets] = useState([]);
  const [products, setProducts] = useState([]);
  const [tab, setTab] = useState('category');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [modalType, setModalType] = useState('category');
  const [search, setSearch] = useState('');

  const EMPTY = { 
    id: 0, category_name: '', merchant_id: '', product_id: '', 
    name: '', fee_percent: 0.05, note: '',
    base_affiliate_fee: 0, base_distribution_fee: 0,
    affiliate_fee: 0, dist_fee: 0
  };

  const load = () => {
    setLoading(true);
    Promise.all([
      fetchJson(`${API}/categories`),
      fetchJson(`${API}/merchants`),
      fetchJson(`${API}/commissions/category`),
      fetchJson(`${API}/commissions/merchant`),
      fetchJson(`${API}/commissions/presets`),
      fetchJson(`${API}/products`),
    ]).then(([c, m, cc, mc, pr, p]) => {
      setCategories(Array.isArray(c) ? c : (c.data || []));
      setMerchants(Array.isArray(m) ? m : (m.data || []));
      setCatComms(Array.isArray(cc) ? cc : (cc.data || []));
      setMerchComms(Array.isArray(mc) ? mc : (mc.data || []));
      setPresets(Array.isArray(pr) ? pr : (pr.data || []));
      setProducts(Array.isArray(p) ? p : (p.data || []));
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const save = (e) => {
    e.preventDefault();
    let ep = '/commissions/category';
    let payload = { ...modal };

    if (modalType === 'category') {
      ep = '/commissions/category';
      delete payload.merchant_id;
      delete payload.product_id;
    } else if (modalType === 'merchant') {
      ep = '/commissions/merchant';
      delete payload.category_name;
      delete payload.product_id;
    } else if (modalType === 'product') {
      ep = '/commissions/product';
      payload = {
        product_id: modal.product_id,
        base_affiliate_fee: modal.base_affiliate_fee,
        base_distribution_fee: modal.base_distribution_fee,
        base_affiliate_fee_nominal: 0,
        base_distribution_fee_nominal: 0
      };
    } else if (modalType === 'presets') {
      ep = '/commissions/presets';
    }

    fetchJson(`${API}${ep}`, { 
      method: (modalType === 'product' || modal.id) ? 'POST' : 'POST', 
      body: JSON.stringify(payload) 
    }).then(() => { 
      load(); 
      setModal(null); 
      toast.success('Protokol berhasil disimpan');
    });
  };

  const remove = (id) => {
    if (!window.confirm('Hapus protokol komisi ini?')) return;
    
    let ep = tab === 'category' ? '/commissions/category' : tab === 'merchant' ? '/commissions/merchant' : tab === 'presets' ? '/commissions/presets' : '/commissions/product';
    
    fetchJson(`${API}${ep}?id=${id}`, { method: 'DELETE' })
      .then(() => {
        toast.success('Protokol berhasil dihapus');
        load();
      })
      .catch(() => toast.error('Gagal menghapus protokol'));
  };

  const openModal = (type, data = null) => {
    setModalType(type);
    setModal(data ? { ...data } : { ...EMPTY });
  };

  const rows = tab === 'category' ? catComms : merchComms;

  return (
    <div style={A.page} className="fade-in">
      <PageHeader title="Commission Engine" subtitle="Kelola fee platform per kategori, merchant, dan produk secara terpisah.">
        <button style={A.btnPrimary} onClick={() => openModal(tab)}>
          <i className="bx bx-plus" /> New Protocol
        </button>
      </PageHeader>

      {/* Tab Switch */}
      <div style={{ display: 'flex', gap: 4, background: '#f8fafc', padding: 4, borderRadius: 12, border: '1px solid #f1f5f9', alignSelf: 'flex-start' }}>
        {[
          { val: 'category', icon: 'bxs-category', label: 'Category Defaults' }, 
          { val: 'merchant', icon: 'bxs-store-alt', label: 'Merchant Overrides' },
          { val: 'product', icon: 'bxs-package', label: 'Product Specifics' },
          { val: 'presets', icon: 'bxs-magic-wand', label: 'Presets' }
        ].map(t => (
          <button key={t.val} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: 13,
            background: tab === t.val ? '#fff' : 'transparent',
            color: tab === t.val ? '#0f172a' : '#94a3b8',
            boxShadow: tab === t.val ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.15s',
          }} onClick={() => setTab(t.val)}>
            <i className={`bx ${t.icon}`} style={{ fontSize: 16 }} />{t.label}
          </button>
        ))}
      </div>

      {/* Info banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', background: '#eef2ff', borderRadius: 14, border: '1px solid #c7d2fe', marginTop: 16 }}>
        <i className="bx bxs-info-circle" style={{ fontSize: 20, color: '#6366f1', flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: '#4338ca', fontWeight: 500 }}>
          {tab === 'category' 
            ? 'Aturan default berdasarkan kategori produk.' 
            : tab === 'merchant'
              ? 'Aturan khusus per merchant yang akan menimpa (override) aturan kategori.'
              : 'Daftar produk dengan pengaturan komisi manual (Custom Commission).'}
        </span>
      </div>

      <TablePanel loading={loading}>
        {tab === 'product' ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
            <thead>
              <tr>
                {['Produk', 'Komisi Afiliasi', 'Fee Distribusi', 'Profitability', 'Aksi'].map((h, i) => (
                  <th key={h} style={{ ...A.th, textAlign: i === 4 ? 'right' : 'left', paddingLeft: i === 0 ? 24 : 16 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.filter(p => p.base_affiliate_fee > 0 || p.base_affiliate_fee_nominal > 0).length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                  Belum ada produk dengan komisi khusus. Klik Kelola di katalog produk untuk mengatur.
                </td></tr>
              ) : products.filter(p => p.base_affiliate_fee > 0 || p.base_affiliate_fee_nominal > 0).map((r, idx) => (
                  <tr key={r.id} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ ...A.td, paddingLeft: 24 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <img src={r.image} style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }} />
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{r.name}</span>
                      </div>
                    </td>
                    <td style={A.td}>
                       {r.base_affiliate_fee > 0 ? `${r.base_affiliate_fee}%` : idr(r.base_affiliate_fee_nominal)}
                    </td>
                    <td style={A.td}>
                       {r.base_distribution_fee > 0 ? `${r.base_distribution_fee}%` : idr(r.base_distribution_fee_nominal)}
                    </td>
                    <td style={A.td}>
                       <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a' }}>Custom Active</span>
                    </td>
                    <td style={{ ...A.td, paddingRight: 24, textAlign: 'right' }}>
                       <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button style={A.iconBtn('#4361ee', '#eef2ff')} onClick={() => window.location.href=`/admin/products/edit?id=${r.id}`} title="Edit">
                          <i className="bx bx-pencil" />
                        </button>
                        <button style={A.iconBtn('#ef4444', '#fef2f2')} onClick={() => remove(r.id)} title="Reset to Default">
                          <i className="bx bx-trash" />
                        </button>
                       </div>
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
            <thead>
              <tr>
                {['Subject', 'Fee Rate', 'Notes', 'Created At', 'Aksi'].map((h, i) => (
                  <th key={h} style={{ ...A.th, textAlign: i === 4 ? 'right' : 'left', paddingLeft: i === 0 ? 24 : 16, paddingRight: i === 4 ? 24 : 16 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                  <i className="bx bx-percentage" style={{ fontSize: 40, display: 'block', marginBottom: 8, opacity: 0.3 }} />
                  Belum ada konfigurasi. Klik "New Protocol" untuk mulai.
                </td></tr>
              ) : rows.map((r, idx) => {
                const name = tab === 'category'
                  ? r.category_name
                  : merchants.find(m => m.id === r.merchant_id)?.store_name || r.merchant_id;
                
                return (
                  <tr key={r.id}
                    style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f5f7ff'}
                    onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa'}
                  >
                    <td style={{ ...A.td, paddingLeft: 24 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <i className={`bx ${tab === 'category' ? 'bxs-category' : 'bxs-store-alt'}`} style={{ color: '#6366f1', fontSize: 17 }} />
                        </div>
                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{name}</span>
                      </div>
                    </td>
                    <td style={A.td}>
                      <span style={{ display: 'inline-flex', padding: '5px 12px', borderRadius: 20, background: '#eef2ff', color: '#6366f1', fontWeight: 800, fontSize: 14 }}>
                        {(r.fee_percent * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td style={A.td}><span style={{ color: '#64748b', fontSize: 13 }}>{r.note || '-'}</span></td>
                    <td style={A.td}>
                       <span style={{ fontSize: 12, color: '#94a3b8' }}>{new Date(r.created_at).toLocaleDateString()}</span>
                    </td>
                    <td style={{ ...A.td, paddingRight: 24, textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button style={A.iconBtn('#6366f1', '#eef2ff')} onClick={() => openModal(tab, r)} title="Edit">
                          <i className="bx bx-pencil" />
                        </button>
                        <button style={A.iconBtn('#ef4444', '#fef2f2')} onClick={() => remove(r.id)} title="Hapus">
                          <i className="bx bx-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </TablePanel>

      {tab === 'presets' && (
        <TablePanel loading={loading}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
                <th style={{ ...A.th, paddingLeft: 24 }}>Preset Name</th>
                <th style={A.th}>Platform Fee</th>
                <th style={A.th}>Base Affiliate</th>
                <th style={A.th}>Base Dist</th>
                <th style={{ ...A.th, textAlign: 'right', paddingRight: 24 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {presets.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>Belum ada preset.</td></tr>
              ) : presets.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ ...A.td, paddingLeft: 24 }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{p.note}</div>
                  </td>
                  <td style={A.td}>
                    <span style={{ padding: '4px 10px', borderRadius: 20, background: '#e0e7ff', color: '#4338ca', fontSize: 12, fontWeight: 700 }}>
                      {(p.fee_percent * 100).toFixed(2)}%
                    </span>
                  </td>
                  <td style={A.td}>{p.affiliate_fee}%</td>
                  <td style={A.td}>{p.dist_fee}%</td>
                  <td style={{ ...A.td, textAlign: 'right', paddingRight: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <button style={A.iconBtn('#6366f1', '#eef2ff')} onClick={() => openModal('presets', p)}>
                        <i className="bx bx-pencil" />
                      </button>
                      <button style={A.iconBtn('#ef4444', '#fef2f2')} onClick={() => remove(p.id)}>
                        <i className="bx bx-trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TablePanel>
      )}

      {modal && (
        <Modal 
          title={`${modal.id ? 'Edit' : 'Buat'} Protokol ${modalType === 'category' ? 'Kategori' : modalType === 'merchant' ? 'Merchant' : modalType === 'presets' ? 'Preset' : 'Produk'}`} 
          onClose={() => { setModal(null); setSearch(''); }}
        >
          <form onSubmit={save}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              
              {/* Preset Selector for quick fill */}
              {(modalType !== 'presets' && !modal.id) && (
                <div style={{ background: '#f0f9ff', padding: '12px 16px', borderRadius: 12, border: '1px solid #bae6fd' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0369a1', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="bx bxs-magic-wand" /> Quick Apply Preset
                  </div>
                  <select 
                    style={{ ...A.select, width: '100%', background: '#fff', fontSize: 13 }}
                    onChange={e => {
                      const p = presets.find(x => x.id === parseInt(e.target.value));
                      if (p) {
                        setModal(m => ({
                          ...m,
                          fee_percent: p.fee_percent,
                          base_affiliate_fee: p.affiliate_fee,
                          base_distribution_fee: p.dist_fee
                        }));
                      }
                    }}
                  >
                    <option value="">— Pilih Preset —</option>
                    {presets.map(p => <option key={p.id} value={p.id}>{p.name} ({p.fee_percent*100}%)</option>)}
                  </select>
                </div>
              )}

              {/* Searchable Target Selector */}
              {modalType !== 'presets' && (
                <div>
                <FieldLabel>
                  {modalType === 'category' ? 'Cari Kategori' : modalType === 'merchant' ? 'Cari Merchant' : 'Cari Produk'}
                </FieldLabel>
                
                {/* Search Input Box */}
                {!modal.id && (
                  <div style={{ position: 'relative', marginBottom: 12 }}>
                    <i className="bx bx-search" style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
                    <input 
                      type="text" placeholder="Ketik untuk mencari..." 
                      style={{ ...A.select, width: '100%', paddingLeft: 38, background: '#f8fafc' }}
                      value={search} onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                )}

                {/* Selection List */}
                <div style={{ 
                  maxHeight: 180, overflowY: 'auto', border: '1.5px solid #e2e8f0', 
                  borderRadius: 12, background: '#fff', display: 'flex', flexDirection: 'column'
                }}>
                  {(() => {
                    const list = modalType === 'category' ? categories : modalType === 'merchant' ? merchants : products;
                    const filtered = list.filter(item => {
                      const name = (item.name || item.store_name || item.category_name || '').toLowerCase();
                      return name.includes(search.toLowerCase());
                    }).slice(0, 50); // Limit for performance

                    if (filtered.length === 0) return <div style={{ padding: 16, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Tidak ditemukan</div>;

                    return filtered.map(item => {
                      const isSelected = modalType === 'category' 
                        ? modal.category_name === item.name 
                        : modalType === 'merchant' 
                          ? modal.merchant_id === item.id 
                          : modal.product_id === item.id;
                      
                      const label = item.name || item.store_name || item.category_name;
                      const sub = modalType === 'product' ? `SKU: ${item.sku} · ${idr(item.price)}` : modalType === 'merchant' ? item.email : 'Global Category';

                      return (
                        <div 
                          key={item.id || item.name}
                          onClick={() => {
                            if (modalType === 'category') setModal(p => ({ ...p, category_name: item.name }));
                            else if (modalType === 'merchant') setModal(p => ({ ...p, merchant_id: item.id }));
                            else setModal(p => ({ ...p, product_id: item.id }));
                          }}
                          style={{ 
                            padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
                            display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.1s',
                            background: isSelected ? '#eef2ff' : '#fff'
                          }}
                        >
                          <div style={{ 
                            width: 32, height: 32, borderRadius: 8, background: isSelected ? '#6366f1' : '#f1f5f9',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                          }}>
                            <i className={`bx ${modalType === 'category' ? 'bx-grid-alt' : modalType === 'merchant' ? 'bx-store' : 'bx-package'}`} 
                              style={{ color: isSelected ? '#fff' : '#64748b', fontSize: 16 }} 
                            />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: isSelected ? '#4338ca' : '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
                            <div style={{ fontSize: 11, color: isSelected ? '#6366f1' : '#94a3b8' }}>{sub}</div>
                          </div>
                          {isSelected && <i className="bx bxs-check-circle" style={{ color: '#6366f1', fontSize: 18 }} />}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
              )}
              
              {/* Values Input Section */}
              <div style={{ background: '#f8fafc', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
                {modalType === 'presets' && (
                  <div style={{ marginBottom: 18 }}>
                    <FieldLabel>Nama Preset</FieldLabel>
                    <input 
                      type="text" placeholder="Contoh: Gold Merchant, Promo Ramadhan" 
                      style={{ ...A.select, width: '100%' }}
                      value={modal.name} onChange={e => setModal(p => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                )}

                <div style={{ marginBottom: 18 }}>
                   <FieldLabel>Platform Fee Rate (%)</FieldLabel>
                   <div style={{ position: 'relative' }}>
                     <input 
                       type="number" step="0.01" min="0" max="100" 
                       style={{ ...A.select, width: '100%', paddingRight: 36, fontSize: 16, fontWeight: 800, color: '#4361ee' }} 
                       value={(modal.fee_percent * 100).toFixed(2)} 
                       onChange={e => setModal(p => ({ ...p, fee_percent: (parseFloat(e.target.value) || 0) / 100 }))} 
                     />
                     <div style={{ position: 'absolute', right: 12, top: 12, fontWeight: 800, color: '#4361ee' }}>%</div>
                   </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                  <div>
                    <FieldLabel>Affiliate Fee (%)</FieldLabel>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="number" step="0.1" 
                        style={{ ...A.select, width: '100%', paddingRight: 32, fontWeight: 700 }} 
                        value={modalType === 'product' ? modal.base_affiliate_fee : modal.affiliate_fee} 
                        onChange={e => setModal(p => ({ ...p, [modalType === 'product' ? 'base_affiliate_fee' : 'affiliate_fee']: parseFloat(e.target.value) || 0 }))} 
                      />
                      <div style={{ position: 'absolute', right: 12, top: 10, color: '#94a3b8', fontWeight: 700 }}>%</div>
                    </div>
                  </div>
                  <div>
                    <FieldLabel>Distribution Fee (%)</FieldLabel>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="number" step="0.1" 
                        style={{ ...A.select, width: '100%', paddingRight: 32, fontWeight: 700 }} 
                        value={modalType === 'product' ? modal.base_distribution_fee : modal.dist_fee} 
                        onChange={e => setModal(p => ({ ...p, [modalType === 'product' ? 'base_distribution_fee' : 'dist_fee']: parseFloat(e.target.value) || 0 }))} 
                      />
                      <div style={{ position: 'absolute', right: 12, top: 10, color: '#94a3b8', fontWeight: 700 }}>%</div>
                    </div>
                  </div>
                </div>
              </div>

              {(modalType === 'merchant' || modalType === 'presets') && (
                <div>
                   <FieldLabel>Catatan Khusus</FieldLabel>
                   <textarea 
                    style={{ ...A.select, width: '100%', minHeight: 70, paddingTop: 10, fontSize: 13 }}
                    placeholder="Masukkan alasan atau detail kesepakatan khusus..."
                    value={modal.note}
                    onChange={e => setModal(p => ({ ...p, note: e.target.value }))}
                   />
                </div>
              )}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 24 }}>
              <button type="button" style={A.btnGhost} onClick={() => { setModal(null); setSearch(''); }}>Batal</button>
              <button type="submit" style={{ ...A.btnPrimary, boxShadow: '0 4px 12px rgba(67, 97, 238, 0.25)' }} disabled={
                modalType === 'presets' ? !modal.name :
                modalType === 'category' ? !modal.category_name : 
                modalType === 'merchant' ? !modal.merchant_id : !modal.product_id
              }>
                <i className="bx bx-check-circle" /> {modal.id ? 'Simpan Perubahan' : 'Aktifkan Protokol'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
