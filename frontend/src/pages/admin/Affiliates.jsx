import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';
import { PageHeader, StatRow, TablePanel, Modal, FieldLabel, statusBadge, idr, fmtDate, A } from '../../lib/adminStyles.jsx';

const API = ADMIN_API_BASE;

const TIER_COLORS = {
  Bronze:   '#cd7f32',
  Silver:   '#94a3b8',
  Gold:     '#f59e0b',
  Platinum: '#6366f1',
};

export default function AdminAffiliates() {
  const [affiliates, setAffiliates] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [tab, setTab] = useState('members');
  const [loading, setLoading] = useState(true);
  const [editCfg, setEditCfg] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchJson(`${API}/affiliates`),
      fetchJson(`${API}/affiliates/configs`),
    ]).then(([af, cfg]) => {
      setAffiliates(af.data || []);
      setConfigs(cfg.data || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const saveCfg = () => {
    if (!editCfg) return;
    setSaving(true);
    fetchJson(`${API}/affiliates/config`, {
      method: 'POST',
      body: JSON.stringify(editCfg),
    }).then(res => {
      if (res.data) {
        setConfigs(prev => {
          const idx = prev.findIndex(c => c.id === res.data.id);
          if (idx >= 0) { const n = [...prev]; n[idx] = res.data; return n; }
          return [...prev, res.data];
        });
      }
      setEditCfg(null);
    }).catch(console.error).finally(() => setSaving(false));
  };

  return (
    <div style={A.page} className="fade-in">
      <PageHeader title="Affiliate Program" subtitle="Kelola anggota, tier komisi, dan performa program afiliasi.">
        {tab === 'config' && (
          <button style={A.btnPrimary} onClick={() => setEditCfg({ id:0, tier_name:'', comm_rate:0.03, min_sales:0, max_sales:0, bonus_rate:0, is_active:true })}>
            <i className="bx bx-plus" /> Tambah Tier
          </button>
        )}
      </PageHeader>

      <StatRow stats={[
        { label: 'Total Affiliate', val: affiliates.length, icon: 'bxs-group', color: '#6366f1' },
        { label: 'Aktif', val: affiliates.filter(a=>a.status==='active').length, icon: 'bxs-check-circle', color: '#10b981' },
        { label: 'Tier Config', val: configs.length, icon: 'bxs-layer', color: '#f59e0b' },
        { label: 'Nonaktif', val: affiliates.filter(a=>a.status!=='active').length, icon: 'bxs-x-circle', color: '#ef4444' },
      ]} />

      {/* Tab Switch */}
      <div style={{ display:'flex', gap:4, background:'#f8fafc', padding:4, borderRadius:12, border:'1px solid #f1f5f9', alignSelf:'flex-start' }}>
        {[{val:'members',label:'Daftar Member'},{val:'config',label:'Konfigurasi Tier'}].map(t=>(
          <button key={t.val} style={{
            padding:'8px 20px', borderRadius:10, border:'none', cursor:'pointer',
            fontWeight:700, fontSize:13,
            background: tab===t.val ? '#fff' : 'transparent',
            color: tab===t.val ? '#0f172a' : '#94a3b8',
            boxShadow: tab===t.val ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            transition:'all 0.15s',
          }} onClick={()=>setTab(t.val)}>{t.label}</button>
        ))}
      </div>

      {tab === 'members' ? (
        <TablePanel loading={loading}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:640 }}>
            <thead>
              <tr>
                {['Member','Email','Status','Tier','Total Sales','Komisi','Terdaftar'].map((h,i)=>(
                  <th key={h} style={{ ...A.th, paddingLeft:i===0?24:16, paddingRight:i===6?24:16 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {affiliates.length === 0 ? (
                <tr><td colSpan={7} style={{ padding:'60px 20px', textAlign:'center', color:'#94a3b8' }}>
                  <i className="bx bxs-group" style={{ fontSize:40, display:'block', marginBottom:8, opacity:0.3 }} />
                  Belum ada member affiliate.
                </td></tr>
              ) : affiliates.map((a, idx) => (
                <tr key={a.id}
                  style={{ background:idx%2===0?'#fff':'#fafafa' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#f5f7ff'}
                  onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?'#fff':'#fafafa'}
                >
                  <td style={{ ...A.td, paddingLeft:24 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#ea580c,#dc2626)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:14, flexShrink:0 }}>
                        {(a.profile?.full_name||a.email||'?').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ fontWeight:700, color:'#0f172a', fontSize:14 }}>{a.profile?.full_name||'—'}</div>
                    </div>
                  </td>
                  <td style={A.td}><span style={{ fontSize:12.5, color:'#64748b' }}>{a.email}</span></td>
                  <td style={A.td}><span style={statusBadge(a.status)}>{a.status}</span></td>
                  <td style={A.td}>
                    <span style={{
                      display:'inline-flex', alignItems:'center', padding:'3px 10px',
                      borderRadius:20, fontSize:11, fontWeight:800,
                      background: (TIER_COLORS[a.tier_name||'Bronze']||'#94a3b8')+'18',
                      color: TIER_COLORS[a.tier_name||'Bronze']||'#94a3b8',
                    }}>{a.tier_name||'Bronze'}</span>
                  </td>
                  <td style={A.td}><span style={{ fontWeight:700, color:'#0f172a' }}>{idr(a.total_sales)}</span></td>
                  <td style={A.td}><span style={{ fontWeight:700, color:'#10b981' }}>{idr(a.total_earned)}</span></td>
                  <td style={{ ...A.td, paddingRight:24 }}>{fmtDate(a.joined_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TablePanel>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:16 }}>
          {configs.length === 0 && !loading && (
            <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'60px 20px', color:'#94a3b8' }}>
              <i className="bx bxs-layer" style={{ fontSize:40, display:'block', marginBottom:8, opacity:0.3 }} />
              Belum ada konfigurasi tier.
            </div>
          )}
          {configs.map(c => {
            const tc = TIER_COLORS[c.tier_name] || '#94a3b8';
            return (
              <div key={c.id} style={{
                background:'#fff', borderRadius:20, overflow:'hidden',
                border:'1px solid #f1f5f9',
                boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
              }}>
                <div style={{ height:5, background:tc }} />
                <div style={{ padding:'20px 22px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
                    <div>
                      <div style={{ fontSize:18, fontWeight:900, color:tc, letterSpacing:'-0.02em' }}>{c.tier_name}</div>
                      <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{c.is_active?'✓ Aktif':'✗ Nonaktif'}</div>
                    </div>
                    <button style={A.iconBtn(tc, tc+'14')} onClick={()=>setEditCfg({...c})} title="Edit">
                      <i className="bx bx-pencil" />
                    </button>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {[
                      { label:'Komisi Dasar', val:`${(c.comm_rate*100).toFixed(1)}%`, color:'#10b981' },
                      { label:'Bonus Rate', val:`${(c.bonus_rate*100).toFixed(1)}%`, color:'#6366f1' },
                      { label:'Min Sales', val:idr(c.min_sales) },
                      { label:'Max Sales', val:c.max_sales>0?idr(c.max_sales):'Unlimited' },
                    ].map(r=>(
                      <div key={r.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <span style={{ fontSize:12.5, color:'#94a3b8', fontWeight:500 }}>{r.label}</span>
                        <span style={{ fontSize:13, fontWeight:800, color:r.color||'#0f172a' }}>{r.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editCfg && (
        <Modal title={`${editCfg.id===0?'Tambah':'Edit'} Tier Komisi`} onClose={()=>setEditCfg(null)}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div style={{ gridColumn:'1/-1' }}>
              <FieldLabel>Nama Tier</FieldLabel>
              <select style={{ ...A.select, width:'100%' }} value={editCfg.tier_name} onChange={e=>setEditCfg(p=>({...p,tier_name:e.target.value}))}>
                <option value="">— Pilih Tier —</option>
                {['Bronze','Silver','Gold','Platinum'].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            {[
              { label:'Komisi Dasar (%)', key:'comm_rate', val:(editCfg.comm_rate*100).toFixed(2) },
              { label:'Bonus Rate (%)', key:'bonus_rate', val:(editCfg.bonus_rate*100).toFixed(2) },
              { label:'Min Sales (Rp)', key:'min_sales', val:editCfg.min_sales, raw:true },
              { label:'Max Sales (0=unlimited)', key:'max_sales', val:editCfg.max_sales, raw:true },
            ].map(f=>(
              <div key={f.key}>
                <FieldLabel>{f.label}</FieldLabel>
                <input
                  type="number" step={f.raw?'1':'0.01'} min="0"
                  style={{ ...A.select, width:'100%' }}
                  value={f.val}
                  onChange={e=>setEditCfg(p=>({...p,[f.key]:f.raw?parseFloat(e.target.value):parseFloat(e.target.value)/100}))}
                />
              </div>
            ))}
            <div style={{ gridColumn:'1/-1', display:'flex', alignItems:'center', gap:10 }}>
              <input type="checkbox" id="tierActive" checked={editCfg.is_active} onChange={e=>setEditCfg(p=>({...p,is_active:e.target.checked}))} style={{ width:16, height:16 }} />
              <label htmlFor="tierActive" style={{ fontSize:13.5, fontWeight:600, color:'#475569', cursor:'pointer' }}>Tier Aktif</label>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:20 }}>
            <button onClick={()=>setEditCfg(null)} style={A.btnGhost}>Batal</button>
            <button onClick={saveCfg} disabled={saving} style={A.btnPrimary}>
              {saving ? '...' : <><i className="bx bx-save" /> Simpan</>}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
