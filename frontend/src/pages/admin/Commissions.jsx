import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';
import { PageHeader, TablePanel, Modal, FieldLabel, idr, A } from '../../lib/adminStyles.jsx';

const API = ADMIN_API_BASE;

export default function AdminCommissions() {
  const [categories, setCategories] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [catComms, setCatComms] = useState([]);
  const [merchComms, setMerchComms] = useState([]);
  const [tab, setTab] = useState('category');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [modalType, setModalType] = useState('category');

  const EMPTY = { id:0, category_id:0, merchant_id:'', fee_percent:0.05, fixed_fee:0, is_active:true };

  const load = () => {
    setLoading(true);
    Promise.all([
      fetchJson(`${API}/categories`),
      fetchJson(`${API}/merchants`),
      fetchJson(`${API}/commissions/category`),
      fetchJson(`${API}/commissions/merchant`),
    ]).then(([c, m, cc, mc]) => {
      setCategories(c.data || []);
      setMerchants(m.data || []);
      setCatComms(cc.data || []);
      setMerchComms(mc.data || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const save = (e) => {
    e.preventDefault();
    const ep = modalType === 'category' ? '/commissions/category' : '/commissions/merchant';
    fetchJson(`${API}${ep}`, { method:'POST', body:JSON.stringify(modal) })
      .then(() => { load(); setModal(null); });
  };

  const openModal = (type, data = null) => {
    setModalType(type);
    setModal(data ? {...data} : {...EMPTY});
  };

  const rows = tab === 'category' ? catComms : merchComms;

  return (
    <div style={A.page} className="fade-in">
      <PageHeader title="Commission Engine" subtitle="Kelola fee platform per kategori dan merchant secara terpisah.">
        <button style={A.btnPrimary} onClick={() => openModal(tab)}>
          <i className="bx bx-plus" /> New Protocol
        </button>
      </PageHeader>

      {/* Tab Switch */}
      <div style={{ display:'flex', gap:4, background:'#f8fafc', padding:4, borderRadius:12, border:'1px solid #f1f5f9', alignSelf:'flex-start' }}>
        {[{val:'category',icon:'bxs-category',label:'Category Defaults'},{val:'merchant',icon:'bxs-store-alt',label:'Merchant Overrides'}].map(t=>(
          <button key={t.val} style={{
            display:'flex', alignItems:'center', gap:8,
            padding:'9px 20px', borderRadius:10, border:'none', cursor:'pointer',
            fontWeight:700, fontSize:13,
            background: tab===t.val ? '#fff' : 'transparent',
            color: tab===t.val ? '#0f172a' : '#94a3b8',
            boxShadow: tab===t.val ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            transition:'all 0.15s',
          }} onClick={()=>setTab(t.val)}>
            <i className={`bx ${t.icon}`} style={{ fontSize:16 }} />{t.label}
          </button>
        ))}
      </div>

      {/* Info banner */}
      <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 20px', background:'#eef2ff', borderRadius:14, border:'1px solid #c7d2fe' }}>
        <i className="bx bxs-info-circle" style={{ fontSize:20, color:'#6366f1', flexShrink:0 }} />
        <span style={{ fontSize:13, color:'#4338ca', fontWeight:500 }}>
          Fee platform akan otomatis dipotong dari setiap transaksi berdasarkan konfigurasi ini.
        </span>
      </div>

      <TablePanel loading={loading}>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:600 }}>
          <thead>
            <tr>
              {['Subject','Fee Rate','Fixed Surcharge','Status','Aksi'].map((h,i)=>(
                <th key={h} style={{ ...A.th, textAlign:i===4?'right':'left', paddingLeft:i===0?24:16, paddingRight:i===4?24:16 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5} style={{ padding:'60px', textAlign:'center', color:'#94a3b8' }}>
                <i className="bx bx-percentage" style={{ fontSize:40, display:'block', marginBottom:8, opacity:0.3 }} />
                Belum ada konfigurasi. Klik "New Protocol" untuk mulai.
              </td></tr>
            ) : rows.map((r, idx) => {
              const name = tab === 'category'
                ? categories.find(c=>c.id===r.category_id)?.name || 'Generic'
                : merchants.find(m=>m.id===r.merchant_id)?.store_name || 'Merchant';
              return (
                <tr key={r.id}
                  style={{ background:idx%2===0?'#fff':'#fafafa' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#f5f7ff'}
                  onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?'#fff':'#fafafa'}
                >
                  <td style={{ ...A.td, paddingLeft:24 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ width:36, height:36, borderRadius:10, background:'#eef2ff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <i className={`bx ${tab==='category'?'bxs-category':'bxs-store-alt'}`} style={{ color:'#6366f1', fontSize:17 }} />
                      </div>
                      <span style={{ fontWeight:700, color:'#0f172a', fontSize:14 }}>{name}</span>
                    </div>
                  </td>
                  <td style={A.td}>
                    <span style={{ display:'inline-flex', padding:'5px 12px', borderRadius:20, background:'#eef2ff', color:'#6366f1', fontWeight:800, fontSize:14 }}>
                      {(r.fee_percent*100).toFixed(1)}%
                    </span>
                  </td>
                  <td style={A.td}><span style={{ fontWeight:700, color:'#0f172a' }}>{idr(r.fixed_fee)}</span></td>
                  <td style={A.td}>
                    <span style={{ display:'inline-flex', padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:r.is_active?'#f0fdf4':'#fff1f2', color:r.is_active?'#16a34a':'#dc2626' }}>
                      {r.is_active?'Active':'Disabled'}
                    </span>
                  </td>
                  <td style={{ ...A.td, paddingRight:24, textAlign:'right' }}>
                    <button style={A.iconBtn('#6366f1','#eef2ff')} onClick={()=>openModal(tab,r)} title="Edit">
                      <i className="bx bx-pencil" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TablePanel>

      {modal && (
        <Modal title={`${modal.id?'Edit':'Buat'} Commission ${modalType === 'category' ? 'Category' : 'Merchant'}`} onClose={()=>setModal(null)}>
          <form onSubmit={save}>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <FieldLabel>{modalType === 'category' ? 'Kategori' : 'Merchant'}</FieldLabel>
                {modalType === 'category' ? (
                  <select style={{ ...A.select, width:'100%' }} value={modal.category_id} onChange={e=>setModal(p=>({...p,category_id:parseInt(e.target.value)}))}>
                    <option value="0">— Pilih Kategori —</option>
                    {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                ) : (
                  <select style={{ ...A.select, width:'100%' }} value={modal.merchant_id} onChange={e=>setModal(p=>({...p,merchant_id:e.target.value}))}>
                    <option value="">— Pilih Merchant —</option>
                    {merchants.map(m=><option key={m.id} value={m.id}>{m.store_name}</option>)}
                  </select>
                )}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <FieldLabel>Fee Rate (desimal, mis: 0.05 = 5%)</FieldLabel>
                  <input type="number" step="0.001" min="0" max="1" style={{ ...A.select, width:'100%' }} value={modal.fee_percent} onChange={e=>setModal(p=>({...p,fee_percent:parseFloat(e.target.value)||0}))} />
                </div>
                <div>
                  <FieldLabel>Fixed Surcharge (Rp)</FieldLabel>
                  <input type="number" style={{ ...A.select, width:'100%' }} value={modal.fixed_fee} onChange={e=>setModal(p=>({...p,fixed_fee:parseFloat(e.target.value)||0}))} />
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:'#f8fafc', borderRadius:11 }}>
                <input type="checkbox" id="commActive" checked={modal.is_active} onChange={e=>setModal(p=>({...p,is_active:e.target.checked}))} style={{ width:16, height:16 }} />
                <label htmlFor="commActive" style={{ fontSize:13.5, fontWeight:600, color:'#475569', cursor:'pointer' }}>Protocol Aktif</label>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:20 }}>
              <button type="button" style={A.btnGhost} onClick={()=>setModal(null)}>Batal</button>
              <button type="submit" style={A.btnPrimary}>
                <i className="bx bx-check-circle" /> Simpan
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
