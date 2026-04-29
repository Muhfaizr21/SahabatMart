import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';
import { PageHeader, TablePanel, Modal, FieldLabel, statusBadge, idr, fmtDate, A } from '../../lib/adminStyles.jsx';

const API = ADMIN_API_BASE;

export default function AdminVouchers() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const EMPTY = { id:0, code:'', title:'', discount_type:'fixed', discount_value:0, min_order:0, quota:100, status:'active' };

  const load = () => {
    setLoading(true);
    fetchJson(`${API}/vouchers`)
      .then(d => setVouchers(Array.isArray(d) ? d : (d?.data || [])))
      .catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const save = () => {
    setSaving(true);
    fetchJson(`${API}/vouchers/upsert`, { method:'POST', body:JSON.stringify(modal) })
      .then(() => { load(); setModal(null); })
      .catch(e => alert(e.message))
      .finally(() => setSaving(false));
  };

  const del = (id) => {
    if (!window.confirm('Hapus voucher ini?')) return;
    fetchJson(`${API}/vouchers/delete?id=${id}`, { method:'DELETE' }).then(load).catch(e=>alert(e.message));
  };

  return (
    <div style={A.page} className="fade-in">
      <PageHeader title="Marketing Vouchers" subtitle="Kelola kampanye diskon dan insentif belanja platform.">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', width: '100%' }}>
          <button style={{ ...A.btnPrimary, flex: '1 1 auto' }} onClick={() => setModal({...EMPTY})}>
            <i className="bx bx-plus" /> Buat Voucher
          </button>
        </div>
      </PageHeader>

      {loading ? (
        <div style={{ textAlign:'center', padding:'60px', color:'#94a3b8' }}>Memuat...</div>
      ) : vouchers.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px', background:'#fff', borderRadius:16, border:'1px solid #f1f5f9' }}>
          <i className="bx bxs-coupon" style={{ fontSize:48, display:'block', marginBottom:12, opacity:0.2, color:'#6366f1' }} />
          <p style={{ color:'#94a3b8', fontWeight:600 }}>Belum ada voucher. Buat yang pertama!</p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: window.innerWidth < 400 ? '1fr' : '1fr 1fr', 
          gap: 16 
        }}>
          {vouchers.map(v => {
            const usedPct = v.quota > 0 ? Math.round((v.used||0)/v.quota*100) : 0;
            const isActive = v.status === 'active';
            return (
              <div key={v.id} style={{ background:'#fff', borderRadius:20, overflow:'hidden', border:'1px solid #f1f5f9', boxShadow:'0 1px 3px rgba(0,0,0,0.04)', display:'flex', flexDirection:'column' }}>
                {/* Header strip */}
                <div style={{ height:4, background: isActive ? 'linear-gradient(90deg,#6366f1,#8b5cf6)' : '#e2e8f0' }} />
                <div style={{ padding:'20px 22px 16px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                    <div style={{ width:42, height:42, borderRadius:12, background:isActive?'#eef2ff':'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <i className="bx bxs-coupon" style={{ fontSize:22, color:isActive?'#6366f1':'#94a3b8' }} />
                    </div>
                    <span style={statusBadge(v.status)}>{v.status}</span>
                  </div>
                  <div style={{ fontSize:16, fontWeight:800, color:'#0f172a', marginBottom:6 }}>{v.title}</div>
                  <div style={{ fontFamily:'monospace', fontSize:13, fontWeight:800, color:'#6366f1', background:'#eef2ff', display:'inline-block', padding:'4px 12px', borderRadius:8, letterSpacing:1 }}>{v.code}</div>
                </div>
                <div style={{ padding:'0 22px 18px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, borderBottom:'1px dashed #f1f5f9' }}>
                  {[
                    { label:'Diskon', val: v.discount_type==='percent' ? `${v.discount_value}%` : idr(v.discount_value) },
                    { label:'Min. Order', val: idr(v.min_order) },
                  ].map(r => (
                    <div key={r.label}>
                      <div style={{ fontSize:10, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:3 }}>{r.label}</div>
                      <div style={{ fontSize:14, fontWeight:800, color:'#0f172a' }}>{r.val}</div>
                    </div>
                  ))}
                  <div style={{ gridColumn:'1/-1' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                      <span style={{ fontSize:11, color:'#94a3b8', fontWeight:500 }}>Penggunaan</span>
                      <span style={{ fontSize:11, fontWeight:800, color:'#0f172a' }}>{v.used||0} / {v.quota}</span>
                    </div>
                    <div style={{ height:6, background:'#f1f5f9', borderRadius:10, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${usedPct}%`, background:usedPct>80?'#ef4444':'#6366f1', borderRadius:10, transition:'width 0.3s' }} />
                    </div>
                  </div>
                </div>
                <div style={{ padding:'12px 22px', display:'flex', gap:8 }}>
                  <button onClick={() => setModal({...v})} style={{ flex:1, padding:'9px', borderRadius:11, border:'1px solid #e2e8f0', background:'#fff', cursor:'pointer', fontWeight:700, fontSize:12.5, color:'#334155', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                    <i className="bx bx-pencil" style={{ fontSize:15 }} /> Edit
                  </button>
                  <button onClick={() => del(v.id)} style={{ flex:1, padding:'9px', borderRadius:11, border:'1px solid #fee2e2', background:'#fff1f2', cursor:'pointer', fontWeight:700, fontSize:12.5, color:'#dc2626', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                    <i className="bx bx-trash" style={{ fontSize:15 }} /> Hapus
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <Modal title={modal.id ? 'Edit Voucher' : 'Buat Voucher Baru'} onClose={() => setModal(null)} wide>
          <div style={{ display:'grid', gridTemplateColumns: window.innerWidth < 640 ? '1fr' : '1fr 1fr', gap:14 }}>
            <div style={{ gridColumn: window.innerWidth < 640 ? 'span 1' : '1/-1' }}>
              <FieldLabel>Judul Voucher</FieldLabel>
              <input style={{ ...A.select, width:'100%' }} placeholder="Promo Ramadhan Berkah" value={modal.title} onChange={e=>setModal(p=>({...p,title:e.target.value}))} />
            </div>
            <div>
              <FieldLabel>Kode (Unik)</FieldLabel>
              <input style={{ ...A.select, width:'100%', fontFamily:'monospace', fontWeight:800, color:'#6366f1' }} placeholder="KODE123" value={modal.code} onChange={e=>setModal(p=>({...p,code:e.target.value.toUpperCase()}))} />
            </div>
            <div>
              <FieldLabel>Status</FieldLabel>
              <select style={{ ...A.select, width:'100%' }} value={modal.status} onChange={e=>setModal(p=>({...p,status:e.target.value}))}>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </div>
            <div>
              <FieldLabel>Tipe Diskon</FieldLabel>
              <select style={{ ...A.select, width:'100%' }} value={modal.discount_type} onChange={e=>setModal(p=>({...p,discount_type:e.target.value}))}>
                <option value="fixed">Nominal (IDR)</option>
                <option value="percent">Persentase (%)</option>
              </select>
            </div>
            <div>
              <FieldLabel>Nilai Diskon</FieldLabel>
              <input type="number" style={{ ...A.select, width:'100%' }} value={modal.discount_value} onChange={e=>setModal(p=>({...p,discount_value:parseFloat(e.target.value)||0}))} />
            </div>
            <div>
              <FieldLabel>Min. Pembelian (Rp)</FieldLabel>
              <input type="number" style={{ ...A.select, width:'100%' }} value={modal.min_order} onChange={e=>setModal(p=>({...p,min_order:parseFloat(e.target.value)||0}))} />
            </div>
            <div>
              <FieldLabel>Kuota Total</FieldLabel>
              <input type="number" style={{ ...A.select, width:'100%' }} value={modal.quota} onChange={e=>setModal(p=>({...p,quota:parseInt(e.target.value)||0}))} />
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:20 }}>
            <button style={A.btnGhost} onClick={() => setModal(null)}>Batal</button>
            <button style={A.btnPrimary} onClick={save} disabled={saving}>
              {saving ? '...' : <><i className="bx bx-check-double" /> {modal.id ? 'Simpan Perubahan' : 'Terbitkan'}</>}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
