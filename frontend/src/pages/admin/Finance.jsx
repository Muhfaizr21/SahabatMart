import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';
import { PageHeader, StatRow, TablePanel, idr, fmtDate, A, Modal } from '../../lib/adminStyles.jsx';

const API = ADMIN_API_BASE;

const TAB_LIST = [
  { val: 'cashflow', icon: 'bx-pie-chart-alt-2', label: 'Cash Flow & Alokasi' },
  { val: 'transactions', icon: 'bx-transfer', label: 'Mutasi Uang' },
  { val: 'ledger', icon: 'bxs-file-find', label: 'Ledger Audit' },
];

export default function AdminFinance() {
  const [cashflow, setCashflow] = useState(null);
  const [txList, setTxList] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [tab, setTab] = useState('cashflow');
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState('');
  
  // Settings modal
  const [showSettings, setShowSettings] = useState(false);
  const [cfg, setCfg] = useState({});
  const [saving, setSaving] = useState(false);

  const loadCashflow = () => {
    setLoading(true);
    fetchJson(`${API}/finance/cashflow${month ? '?month='+month : ''}`).then(d => {
      setCashflow(d || null);
      if (d) {
        setCfg({
          allocations: (d.allocations || []).map(a => ({ ...a, rate: a.rate * 100 })),
          split_aplikasi_dagang: (d.split_aplikasi_dagang || 0) * 100,
          split_akuglow: (d.split_akuglow || 0) * 100,
        });
      }
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (tab === 'cashflow') loadCashflow();
    if (tab === 'transactions') {
      fetchJson(`${API}/transactions`).then(d => {
        const list = Array.isArray(d) ? d : (d?.data || []);
        setTxList(list);
      });
    }
    if (tab === 'ledger') {
      fetchJson(`${API}/finance/ledger`).then(d => {
        const list = Array.isArray(d) ? d : (d?.data || []);
        setLedger(list);
      });
    }
  }, [tab, month]);

  const saveConfig = async () => {
    setSaving(true);
    try {
      await fetchJson(`${API}/finance/cashflow/config`, {
        method: 'POST',
        body: JSON.stringify({
          allocations: cfg.allocations.map(a => ({
            key: a.key,
            value: parseFloat(a.rate) / 100,
            label: a.label
          })),
          split_aplikasi_dagang: parseFloat(cfg.split_aplikasi_dagang) / 100,
          split_akuglow: parseFloat(cfg.split_akuglow) / 100,
        })
      });
      setShowSettings(false);
      loadCashflow();
    } catch(e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const addAllocation = () => {
    const newKey = `alloc_new_${Date.now()}`;
    setCfg({
      ...cfg,
      allocations: [...cfg.allocations, { key: newKey, label: 'Kategori Baru', rate: 0 }]
    });
  };

  const removeAllocation = (key) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus alokasi ini? Perubahan akan permanen setelah Anda klik Simpan.')) {
      setCfg({
        ...cfg,
        allocations: cfg.allocations.filter(a => a.key !== key)
      });
    }
  };

  const updateAlloc = (key, field, val) => {
    setCfg({
      ...cfg,
      allocations: cfg.allocations.map(a => a.key === key ? { ...a, [field]: val } : a)
    });
  };

  const FlowCard = ({ title, amount, color, icon, items }) => (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', padding: 24, flex: '1 1 300px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: color+'14', color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
          <i className={`bx ${icon}`} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{title}</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{idr(amount)}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: i < items.length-1 ? '1px dashed #e2e8f0' : 'none' }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>{it.label}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: it.color || '#0f172a' }}>{idr(it.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={A.page} className="fade-in">
      <PageHeader title="Arus Kas & Keuangan" subtitle="Laporan pembagian revenue, alokasi keuntungan, dan mutasi uang.">
        <div style={{ display: 'flex', gap: 10 }}>
          <input type="month" style={{ ...A.select, width: 180 }} value={month} onChange={e => setMonth(e.target.value)} />
          <button style={A.btnGhost} onClick={() => window.location.reload()}><i className="bx bx-refresh" /> Refresh</button>
          <button style={A.btnPrimary} onClick={() => setShowSettings(true)}><i className="bx bx-cog" /> Atur Persentase</button>
        </div>
      </PageHeader>

      <div style={{ display:'flex', background:'#f8fafc', padding:4, borderRadius:14, border:'1px solid #f1f5f9', gap:4, alignSelf:'flex-start' }}>
        {TAB_LIST.map(t => (
          <button key={t.val} style={{
            display:'flex', alignItems:'center', gap:7,
            padding:'9px 20px', borderRadius:11, border:'none',
            fontWeight:700, fontSize:13, cursor:'pointer',
            background: tab===t.val ? '#fff' : 'transparent',
            color: tab===t.val ? '#0f172a' : '#94a3b8',
            boxShadow: tab===t.val ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
          }} onClick={() => setTab(t.val)}>
            <i className={`bx ${t.icon}`} style={{ fontSize:16 }} />{t.label}
          </button>
        ))}
      </div>

      {tab === 'cashflow' && cashflow && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Layer 1: Revenue */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
            <FlowCard 
              title="1. Pembagian Revenue" 
              amount={cashflow.total_revenue} 
              color="#3b82f6" 
              icon="bx-wallet"
              items={[
                { label: 'Uang Modal (HPP)', value: cashflow.total_cogs, color: '#ef4444' },
                { label: 'Bonus Affiliate', value: cashflow.total_affiliate_bonus, color: '#f59e0b' },
                { label: 'Bonus Merchant', value: cashflow.total_merchant_bonus, color: '#8b5cf6' },
                { label: 'Keuntungan Kotor', value: cashflow.gross_profit, color: '#10b981' },
              ]}
            />
            {/* Layer 2: Gross Profit Allocation */}
            <FlowCard 
              title="2. Alokasi Keuntungan Kotor" 
              amount={cashflow.gross_profit} 
              color="#10b981" 
              icon="bx-pie-chart"
              items={[
                ...(cashflow.allocations || []).map(a => ({
                   label: `${a.label} (${(a.rate*100).toFixed(1)}%)`,
                   value: a.value
                })),
                { label: 'Keuntungan Bersih', value: cashflow.net_profit, color: '#14b8a6' },
              ]}
            />
            {/* Layer 3: Net Profit Split */}
            <FlowCard 
              title="3. Pembagian Keuntungan Bersih" 
              amount={cashflow.net_profit} 
              color="#14b8a6" 
              icon="bxs-bank"
              items={[
                { label: `Aplikasi Dagang (${(cashflow.split_aplikasi_dagang*100).toFixed(1)}%)`, value: cashflow.net_aplikasi_dagang, color: '#6366f1' },
                { label: `Akuglow (${(cashflow.split_akuglow*100).toFixed(1)}%)`, value: cashflow.net_akuglow, color: '#ec4899' },
              ]}
            />
          </div>

          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', padding: 24 }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: '#0f172a' }}>Alokasi Uang Bulanan (Kas Internal)</h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Pantau saldo di berbagai lokasi penyimpanan.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div style={{ padding: 20, borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Tunai / Cash</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>{idr(0)}</div>
              </div>
              <div style={{ padding: 20, borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Rekening Bank</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>{idr(0)}</div>
              </div>
              <div style={{ padding: 20, borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>E-Wallet</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>{idr(0)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mutasi Uang */}
      {tab === 'transactions' && (
        <TablePanel loading={loading}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={A.th}>Tanggal</th>
                <th style={A.th}>ID Ref</th>
                <th style={A.th}>Kategori</th>
                <th style={A.th}>Nominal</th>
                <th style={A.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {txList.map((t, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={A.td}>{fmtDate(t.created_at)}</td>
                  <td style={A.td}><code style={{background:'#f1f5f9', padding:'2px 6px', borderRadius:4}}>{t.id?.slice(0,8)}</code></td>
                  <td style={A.td}>{t.type}</td>
                  <td style={{ ...A.td, color: t.amount < 0 ? '#ef4444' : '#10b981', fontWeight: 700 }}>
                    {t.amount < 0 ? '-' : '+'}{idr(Math.abs(t.amount))}
                  </td>
                  <td style={A.td}>Selesai</td>
                </tr>
              ))}
              {txList.length === 0 && <tr><td colSpan={5} style={{textAlign:'center', padding:40, color:'#94a3b8'}}>Belum ada mutasi uang.</td></tr>}
            </tbody>
          </table>
        </TablePanel>
      )}

      {/* Ledger */}
      {tab === 'ledger' && (
        <TablePanel loading={loading}>
           <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={A.th}>Timestamp</th>
                <th style={A.th}>Tipe Operasi</th>
                <th style={A.th}>Arus Dana</th>
                <th style={A.th}>Saldo Akhir</th>
                <th style={A.th}>Referensi</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((l, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={A.td}>{fmtDate(l.created_at)}</td>
                  <td style={A.td}>{l.type}</td>
                  <td style={{ ...A.td, color: l.amount < 0 ? '#ef4444' : '#10b981', fontWeight: 700 }}>
                    {l.amount < 0 ? '-' : '+'}{idr(Math.abs(l.amount))}
                  </td>
                  <td style={A.td}>{idr(l.balance_after)}</td>
                  <td style={A.td}><code style={{background:'#f1f5f9', padding:'2px 6px', borderRadius:4}}>{l.reference_id?.slice(0,8)}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </TablePanel>
      )}

      {showSettings && (
        <Modal title="Atur Alokasi & Profit Share" onClose={() => setShowSettings(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h4 style={{ margin: 0, color: '#0f172a', fontSize: 14 }}>Daftar Alokasi Pengeluaran</h4>
            
            {cfg.allocations.map((a, idx) => (
              <div key={a.key} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', padding: 12, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ ...A.label, fontSize: 11 }}>Nama Alokasi</label>
                  <input type="text" style={{ ...A.input, padding: '6px 10px' }} value={a.label} onChange={e => updateAlloc(a.key, 'label', e.target.value)} />
                </div>
                <div style={{ width: 80 }}>
                  <label style={{ ...A.label, fontSize: 11 }}>Rate (%)</label>
                  <input type="number" style={{ ...A.input, padding: '6px 10px' }} value={a.rate} onChange={e => updateAlloc(a.key, 'rate', e.target.value)} />
                </div>
                <button onClick={() => removeAllocation(a.key)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 8, width: 34, height: 34, cursor: 'pointer' }}>
                  <i className="bx bx-trash" />
                </button>
              </div>
            ))}
            
            <button style={{ ...A.btnGhost, padding: '8px', border: '1px dashed #cbd5e1' }} onClick={addAllocation}>
              <i className="bx bx-plus" /> Tambah Alokasi Baru
            </button>

            <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '10px 0' }} />
            <h4 style={{ margin: 0, color: '#0f172a', fontSize: 14 }}>Pembagian Keuntungan Bersih</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={A.label}>Aplikasi Dagang (%)</label>
                <input type="number" style={A.input} value={cfg.split_aplikasi_dagang} onChange={e => setCfg({...cfg, split_aplikasi_dagang: e.target.value})} />
              </div>
              <div>
                <label style={A.label}>Akuglow (%)</label>
                <input type="number" style={A.input} value={cfg.split_akuglow} onChange={e => setCfg({...cfg, split_akuglow: e.target.value})} />
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
              <button style={A.btnGhost} onClick={() => setShowSettings(false)}>Batal</button>
              <button style={A.btnPrimary} onClick={saveConfig} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
