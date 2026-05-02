import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';
import { PageHeader, TablePanel, Modal, FieldLabel, A } from '../../lib/adminStyles.jsx';

const API = ADMIN_API_BASE;

// Local IDR Formatter to avoid import errors
const idr = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);

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
      setCategories(c.data || c || []);
      setMerchants(m.data || m || []);
      setCatComms(cc.data || cc || []);
      setMerchComms(mc.data || mc || []);
      setPresets(pr.data || pr || []);
      setProducts(p.data || p || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const save = (e) => {
    e.preventDefault();
    let ep = '/commissions/category';
    let payload = { ...modal };

    // DEBUG: Ensure we only send ID if it's a real commission record ID
    const isNewRule = !modal.is_custom_rule;

    if (modalType === 'category') {
      ep = '/commissions/category';
      payload = {
        id: isNewRule ? 0 : modal.id,
        category_name: modal.category_name || modal.name,
        fee_percent: parseFloat(modal.fee_percent || 0),
        affiliate_fee: parseFloat(modal.affiliate_fee || 0),
        dist_fee: parseFloat(modal.dist_fee || 0)
      };
    } else if (modalType === 'merchant') {
      ep = '/commissions/merchant';
      payload = {
        id: isNewRule ? 0 : modal.id,
        merchant_id: modal.merchant_id || modal.id,
        fee_percent: parseFloat(modal.fee_percent || 0),
        affiliate_fee: parseFloat(modal.affiliate_fee || 0),
        dist_fee: parseFloat(modal.dist_fee || 0),
        note: modal.note || ''
      };
    } else if (modalType === 'product') {
      ep = '/commissions/product';
      payload = {
        product_id: modal.product_id || modal.id,
        base_affiliate_fee: parseFloat(modal.base_affiliate_fee || 0),
        base_distribution_fee: parseFloat(modal.base_distribution_fee || 0),
      };
    } else if (modalType === 'presets') {
      ep = '/commissions/presets';
    }

    fetchJson(`${API}${ep}`, { method: 'POST', body: JSON.stringify(payload) })
      .then(() => { 
        load(); 
        setModal(null); 
        toast.success('Aturan komisi berhasil disimpan!');
      }).catch(err => {
        toast.error('Gagal menyimpan: ' + err.message);
      });
  };

  const remove = (id) => {
    if (!window.confirm('Hapus aturan komisi ini?')) return;
    let ep = tab === 'category' ? '/commissions/category' : tab === 'merchant' ? '/commissions/merchant' : tab === 'presets' ? '/commissions/presets' : '/commissions/product';
    fetchJson(`${API}${ep}?id=${id}`, { method: 'DELETE' }).then(() => {
      toast.success('Aturan dihapus dan kembali ke default');
      load();
    });
  };

  const rows = tab === 'category' ? catComms : merchComms;

  return (
    <div style={A.page} className="fade-in">
      <PageHeader title="Commission Hub" subtitle="Atur pembagian profit otomatis antara Platform, Merchant, dan Affiliate.">
        {tab === 'presets' && (
          <button style={{ ...A.btnPrimary, borderRadius: 12, padding: '10px 20px' }} onClick={() => { setModalType('presets'); setModal({ ...EMPTY }); }}>
            <i className="bx bx-plus-circle" style={{ fontSize: 18 }} /> Tambah Preset
          </button>
        )}
      </PageHeader>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Kategori Aktif', val: catComms.length, icon: 'bx-category', color: '#6366f1' },
          { label: 'Merchant Khusus', val: merchComms.length, icon: 'bx-store', color: '#22c55e' },
          { label: 'Produk Custom', val: products.filter(p => p.base_affiliate_fee > 0).length, icon: 'bx-package', color: '#eab308' },
          { label: 'Presets', val: presets.length, icon: 'bx-magic-wand', color: '#ec4899' }
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', padding: '16px 20px', borderRadius: 16, border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${s.color}15`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
              <i className={`bx ${s.icon}`} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>{s.val}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, background: '#f8fafc', padding: 6, borderRadius: 16, border: '1px solid #f1f5f9', alignSelf: 'flex-start', marginBottom: 20 }}>
        {[
          { id: 'category', label: 'Default Kategori', icon: 'bx-grid-alt' },
          { id: 'merchant', label: 'Spesifik Merchant', icon: 'bx-store-alt' },
          { id: 'product', label: 'Custom Produk', icon: 'bx-package' },
          { id: 'presets', label: 'Template Preset', icon: 'bx-bolt-circle' }
        ].map(t => (
          <button 
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '10px 18px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s',
              background: tab === t.id ? '#fff' : 'transparent',
              color: tab === t.id ? '#4361ee' : '#94a3b8',
              boxShadow: tab === t.id ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            <i className={`bx ${t.icon}`} style={{ fontSize: 18 }} /> {t.label}
          </button>
        ))}
      </div>

      <TablePanel loading={loading}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
          <thead>
            <tr>
              <th style={{ ...A.th, paddingLeft: 24 }}>Subjek</th>
              <th style={A.th}>Fee Platform</th>
              <th style={A.th}>Affiliate</th>
              <th style={A.th}>Distribusi</th>
              <th style={{ ...A.th, textAlign: 'right', paddingRight: 24 }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {(tab === 'product' ? products : tab === 'presets' ? presets : tab === 'merchant' ? merchants : categories).map((r, i) => {
              const isProd = tab === 'product';
              const isMerch = tab === 'merchant';
              const isCat = tab === 'category';
              
              let isCustom = false;
              let displayData = { ...r };

              if (isProd) {
                isCustom = r.base_affiliate_fee > 0 || r.base_distribution_fee > 0;
              } else if (isMerch) {
                const merchRule = merchComms.find(mc => mc.merchant_id === r.id);
                isCustom = !!merchRule;
                if (merchRule) displayData = { ...merchRule };
              } else if (isCat) {
                const catRule = catComms.find(cc => cc.category_name === r.name || cc.category_name === r.category_name);
                isCustom = !!catRule;
                if (catRule) displayData = { ...catRule };
              }

              // Store custom rule state in displayData so save() knows
              displayData.is_custom_rule = isCustom;

              return (
                <tr key={r.id || i} style={{ background: '#fff', transition: 'all 0.1s' }}>
                  <td style={{ ...A.td, paddingLeft: 24, borderTopLeftRadius: 12, borderBottomLeftRadius: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className={`bx ${isCat ? 'bx-folder' : isMerch ? 'bx-store' : 'bx-package'}`} style={{ color: isCustom ? '#4361ee' : '#94a3b8' }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          {isCat ? (r.name || r.category_name) : isMerch ? (r.store_name || r.name) : r.name}
                          {(isProd || isMerch || isCat) && tab !== 'presets' && (
                            <span style={{ 
                              marginLeft: 8, fontSize: 10, padding: '2px 6px', borderRadius: 4, 
                              background: isCustom ? '#eef2ff' : '#f1f5f9', 
                              color: isCustom ? '#4361ee' : '#94a3b8',
                              border: `1px solid ${isCustom ? '#c7d2fe' : '#e2e8f0'}`
                            }}>
                              {isCustom ? 'CUSTOM' : 'DEFAULT'}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>
                          {isMerch ? (r.owner_name || 'Merchant SahabatMart') : (isProd ? `SKU: ${r.sku || '-'}` : isCat ? 'Aturan Kategori' : r.note || 'Aturan Aktif')}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={A.td}>
                    <span style={{ padding: '4px 10px', borderRadius: 8, background: isCustom ? '#eef2ff' : '#f8fafc', color: isCustom ? '#4361ee' : '#94a3b8', fontWeight: 800, fontSize: 12 }}>
                      {((displayData.fee_percent || displayData.base_affiliate_fee || 0) * (tab === 'presets' || isProd ? 1 : 100)).toFixed(1)}%
                    </span>
                  </td>
                  <td style={A.td}>{displayData.affiliate_fee || displayData.base_affiliate_fee || 0}%</td>
                  <td style={A.td}>{displayData.dist_fee || displayData.base_distribution_fee || 0}%</td>
                  <td style={{ ...A.td, textAlign: 'right', paddingRight: 24, borderTopRightRadius: 12, borderBottomRightRadius: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                      <button style={A.iconBtn('#4361ee', '#eef2ff')} onClick={() => { setModalType(tab); setModal(displayData); }}>
                        <i className="bx bx-edit-alt" />
                      </button>
                      {isCustom && tab !== 'presets' && (
                        <button style={A.iconBtn('#ef4444', '#fef2f2')} onClick={() => remove(displayData.id)}>
                          <i className="bx bx-trash-alt" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TablePanel>

      {modal && (
        <Modal title={`${modal.id ? 'Edit' : 'Tambah'} Aturan Komisi`} onClose={() => setModal(null)}>
          <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {!modal.id && (
              <div>
                <FieldLabel>Pilih Target Aturan</FieldLabel>
                <select 
                  style={{ ...A.select, width: '100%' }}
                  onChange={e => {
                    const val = e.target.value;
                    if (tab === 'category') setModal(m => ({ ...m, category_name: val }));
                    else if (tab === 'merchant') setModal(m => ({ ...m, merchant_id: val }));
                    else setModal(m => ({ ...m, product_id: val }));
                  }}
                >
                  <option value="">— Pilih —</option>
                  {(tab === 'category' ? categories : tab === 'merchant' ? merchants : products).map(x => (
                    <option key={x.id} value={x.id || x.name}>{x.name || x.store_name || x.category_name}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ background: '#f8fafc', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <FieldLabel>Persentase Fee Platform (%)</FieldLabel>
                <input 
                  type="number" step="0.1"
                  style={{ ...A.select, width: '100%', fontSize: 18, fontWeight: 800, color: '#4361ee' }}
                  value={(modal.fee_percent || 0) * (tab === 'presets' ? 1 : 100)}
                  onChange={e => setModal(m => ({ ...m, fee_percent: parseFloat(e.target.value) / (tab === 'presets' ? 1 : 100) }))}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <FieldLabel>Affiliate (%)</FieldLabel>
                  <input 
                    type="number" style={{ ...A.select, width: '100%', boxSizing: 'border-box' }}
                    value={modal.affiliate_fee || modal.base_affiliate_fee || 0}
                    onChange={e => setModal(m => ({ ...m, [tab === 'product' ? 'base_affiliate_fee' : 'affiliate_fee']: parseFloat(e.target.value) }))}
                  />
                </div>
                <div>
                  <FieldLabel>Distribusi (%)</FieldLabel>
                  <input 
                    type="number" style={{ ...A.select, width: '100%', boxSizing: 'border-box' }}
                    value={modal.dist_fee || modal.base_distribution_fee || 0}
                    onChange={e => setModal(m => ({ ...m, [tab === 'product' ? 'base_distribution_fee' : 'dist_fee']: parseFloat(e.target.value) }))}
                  />
                </div>
              </div>
            </div>

            <button type="submit" style={A.btnPrimary}>Simpan Aturan</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
