import React, { useState, useEffect, useCallback } from 'react';
import { ADMIN_API_BASE, fetchJson, formatImage } from '../../lib/api';
import { PageHeader, StatRow, TablePanel, Modal, FieldLabel, statusBadge, idr, fmtDate, A } from '../../lib/adminStyles.jsx';

const API = ADMIN_API_BASE;

const CustomSelect = ({ label, value, options, onChange, icon }) => {
  const [open, setOpen] = useState(false);
  const ref = React.useRef();

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

export default function AdminMerchants() {
  const [merchants, setMerchants] = useState([]);
  const [stats, setStats] = useState({});
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [order, setOrder] = useState('desc');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [note, setNote] = useState('');
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const isMobile = windowWidth < 640;
  const isTablet = windowWidth < 1024;

  // Commission override state
  const [commission, setCommission] = useState({ fee_percent: 0, loading: false });
  const [areas, setAreas] = useState([]);
  const [searchingArea, setSearchingArea] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [logisticChannels, setLogisticChannels] = useState([]);

  const loadLogistics = () => {
    fetchJson(`${API}/logistics`)
      .then(res => {
        const data = Array.isArray(res) ? res : (res.data || []);
        setLogisticChannels(data);
      })
      .catch(console.error);
  };

  // Handle window resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (filter) p.append('status', filter);
    if (debouncedSearch) p.append('search', debouncedSearch);
    if (sortBy) p.append('sort', sortBy);
    if (order) p.append('order', order);
    Promise.all([
      fetchJson(`${API}/merchants?${p}`),
      fetchJson(`${API}/merchants/stats`),
    ]).then(([list, s]) => {
      const data = Array.isArray(list) ? list : (list.data || []);
      setMerchants(data);
      setStats(s || {});
    }).catch(console.error).finally(() => setLoading(false));
  }, [filter, debouncedSearch, sortBy, order]);

  // Load logistics on mount
  useEffect(() => {
    loadLogistics();
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Trigger load instantly when any filter/sort changes
  useEffect(() => {
    load();
  }, [load]);

  const loadCommission = (merchantId) => {
    setCommission({ ...commission, loading: true });
    fetchJson(`${API}/merchants/commissions?merchant_id=${merchantId}`)
      .then(res => {
        const list = Array.isArray(res) ? res : (res.data || []);
        const data = list.length > 0 ? list[0] : { fee_percent: 0.05 }; // Default 5%
        setCommission({ fee_percent: data.fee_percent * 100, loading: false, id: data.id });
      })
      .catch(() => setCommission({ fee_percent: 5, loading: false }));
  };

  const saveCommission = () => {
    if (!modal) return;
    setCommission({ ...commission, loading: true });
    fetchJson(`${API}/merchants/commissions`, {
      method: 'POST',
      body: JSON.stringify({
        id: commission.id || undefined,
        merchant_id: modal.id,
        fee_percent: parseFloat(commission.fee_percent) / 100
      })
    }).then(() => {
      alert('Merchant specific commission rate updated successfully.');
      setCommission({ ...commission, loading: false });
    }).catch(err => {
      alert(_err.message);
      setCommission({ ...commission, loading: false });
    });
  };

  const updateStatus = (id, status) => {
    fetchJson(`${API}/merchants/status`, {
      method: 'PUT',
      body: JSON.stringify({ merchant_id: id, status, suspend_note: note }),
    }).then(() => { load(); setModal(null); setNote(''); });
  };

  const [verifying, setVerifying] = useState(false);
  const toggleVerify = (id, current) => {
    setVerifying(true);
    fetchJson(`${API}/merchants/verify`, {
      method: 'PUT',
      body: JSON.stringify({ merchant_id: id, verified: !current }),
    }).then(() => {
      if (modal && modal.id === id) {
        setModal({ ...modal, is_verified: !current });
      }
      load();
    }).catch(err => {
      alert("Gagal mengupdate status verifikasi: " + _err.message);
    }).finally(() => {
      setVerifying(false);
    });
  };

  const handleSearchArea = async (input) => {
    setSearchInput(input);
    if (input.length < 3) {
      setAreas([]);
      return;
    }
    setSearchingArea(true);
    try {
      const res = await fetchJson(`/api/shipping/areas?input=${input}`);
      setAreas(res.areas || []);
    } catch (_err) {
      console.error(_err);
    } finally {
      setSearchingArea(false);
    }
  };

  const updateMerchantArea = (area) => {
    if (!modal) return;
    const cityName = area.administrative_division_level_2_name || area.city_name || '';
    const provName = area.administrative_division_level_1_name || area.province_name || '';
    fetchJson(`${API}/merchants/update`, {
      method: 'PUT',
      body: JSON.stringify({ 
        merchant_id: modal.id, 
        biteship_area_id: area.id,
        area_name: area.name,
        city: cityName,
        province: provName,
        is_verified: modal.is_verified 
      }),
    }).then(() => {
      setModal({ 
        ...modal, 
        biteship_area_id: area.id,
        area_name: area.name,
        city: cityName,
        province: provName
      });
      setAreas([]);
      setSearchInput('');
      load();
    }).catch(alert);
  };

  const toggleCourier = (code) => {
    if (!modal) return;
    let current = modal.enabled_couriers ? modal.enabled_couriers.split(',').filter(Boolean) : [];
    if (current.includes(code)) {
        current = current.filter(c => c !== code);
    } else {
        current.push(code);
    }
    const newList = current.join(',');
    
    fetchJson(`${API}/merchants/update`, {
      method: 'PUT',
      body: JSON.stringify({ 
        merchant_id: modal.id, 
        enabled_couriers: newList,
        is_verified: modal.is_verified 
      }),
    }).then(() => {
      setModal({ ...modal, enabled_couriers: newList });
      load();
    }).catch(alert);
  };

  const filterBar = (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, width: '100%', alignItems: 'center' }}>
      {/* Search Input */}
      <div style={{ ...A.searchWrap, minWidth: 280, flex: 1, position: 'relative' }}>
        <i className="bx bx-search" style={A.searchIcon} />
        <input
          style={{ ...A.searchInput, width: '100%', paddingLeft: 40, paddingRight: 36, height: 42 }}
          placeholder="Cari nama merchant..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button 
            onClick={() => setSearch('')}
            style={{ 
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4,
              display: 'flex', alignItems: 'center'
            }}
          >
            <i className="bx bxs-x-circle" style={{ fontSize: 18 }} />
          </button>
        )}
      </div>

      {/* Selects */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <CustomSelect 
          label="Status" 
          value={filter} 
          icon="bx-toggle-left"
          options={[
            { value: '', label: 'Semua Status' },
            { value: 'active', label: 'Operasional' },
            { value: 'pending', label: 'Antrean Verifikasi' },
            { value: 'suspended', label: 'Sanksi' }
          ]}
          onChange={setFilter}
        />

        <CustomSelect 
          label="Urutan" 
          value={sortBy} 
          icon="bx-sort-alt-2"
          options={[
            { value: 'created_at', label: 'Tanggal Bergabung' },
            { value: 'name', label: 'Nama Toko' },
            { value: 'status', label: 'Status' },
            { value: 'balance', label: 'Saldo' },
            { value: 'total_sales', label: 'Omzet' }
          ]}
          onChange={setSortBy}
        />

        <CustomSelect 
          label="Arah" 
          value={order} 
          icon="bx-transfer-alt"
          options={[
            { value: 'asc', label: 'ASC' },
            { value: 'desc', label: 'DESC' }
          ]}
          onChange={setOrder}
        />
      </div>

      <button style={{ ...A.btnGhost, height: 42, width: 42, padding: 0, justifyContent: 'center' }} onClick={load}>
        <i className="bx bx-refresh" style={{ fontSize: 20 }} />
      </button>
    </div>
  );

  return (
    <div style={A.page} className="fade-in">
      <PageHeader title="Daftar Merchant & Tenant" subtitle="Pusat kendali mitra bisnis. Kelola verifikasi, batasan operasional, dan kesepakatan komisi khusus." />

      <StatRow stats={[
        { label: 'Merchant Aktif', val: stats.active || 0, icon: 'bx-store', color: '#10b981' },
        { label: 'Menunggu Persetujuan', val: stats.pending || 0, icon: 'bx-time-five', color: '#f59e0b' },
        { label: 'Merchant Diblokir', val: stats.suspended || 0, icon: 'bx-block', color: '#ef4444' },
      ]} />

      <TablePanel
        loading={loading}
        toolbar={filterBar}
      >
        {/* Desktop Table View */}
        {!isMobile ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr>
                {[
                  { key: 'name', label: 'Entitas Toko', sortable: true },
                  { key: 'status', label: 'Status Operasional', sortable: true },
                  { key: 'is_verified', label: 'Legalitas', sortable: false },
                  { key: 'balance', label: 'Arus Kas', sortable: true },
                  { key: 'joined_at', label: 'Bergabung', sortable: true },
                ].map((h, i) => {
                  const isCurrentSort = sortBy === h.key;
                  return (
                    <th 
                      key={h.label} 
                      style={{ 
                        ...A.th, 
                        textAlign: 'left',
                        paddingLeft: i === 0 ? 24 : 16, 
                        paddingRight: 16,
                        cursor: h.sortable ? 'pointer' : 'default',
                        userSelect: 'none'
                      }}
                      onClick={() => {
                        if (!h.sortable) return;
                        if (sortBy === h.key) {
                          setOrder(o => o === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy(h.key);
                          setOrder('desc');
                        }
                      }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {h.label}
                        {h.sortable && (
                          <i className={`bx ${
                            isCurrentSort 
                              ? (order === 'asc' ? 'bx-chevron-up' : 'bx-chevron-down') 
                              : 'bx-sort-alt-2'
                          }`} style={{ 
                            fontSize: 13, 
                            color: isCurrentSort ? '#6366f1' : '#94a3b8' 
                          }} />
                        )}
                      </div>
                    </th>
                  );
                })}
                <th style={{ ...A.th, textAlign: 'right', paddingRight: 24 }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {merchants.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '80px 20px', textAlign: 'center', color: '#94a3b8' }}>
                  <i className="bx bx-store-alt" style={{ fontSize: 60, display: 'block', marginBottom: 16, opacity: 0.1 }} />
                  <div style={{ fontWeight: 800 }}>Tidak ada entitas yang terdeteksi di sektor ini.</div>
                </td></tr>
              ) : merchants.map((m, idx) => (
                <tr key={m.id}
                  style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f5f7ff'}
                  onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa'}
                >
                  <td style={{ ...A.td, paddingLeft: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: m.logo_url ? `url(${formatImage(m.logo_url)})` : 'linear-gradient(135deg, #4f46e5, #7c3aed)', backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #e2e8f0' }}>
                        {!m.logo_url && <i className="bx bxs-store-alt" style={{ color: '#fff', fontSize: 20 }} />}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 14.5 }}>{m.store_name}</div>
                        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>TENANT-ID: {m.id?.slice(0, 8)} | {m.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td style={A.td}><div style={statusBadge(m.status)}>{m.status?.toUpperCase()}</div></td>
                  <td style={A.td}>
                    <div style={{ ...statusBadge(m.is_verified ? 'verified' : 'draft'), borderRadius: 8, padding: '6px 10px', fontSize: 10 }}>
                      <i className={`bx ${m.is_verified ? 'bxs-badge-check' : 'bx-badge'}`} style={{ fontSize: 14 }} />
                      {m.is_verified ? 'LEGALLY VERIFIED' : 'PENDING DOCS'}
                    </div>
                  </td>
                  <td style={A.td}>
                    <div style={{ fontWeight: 900, color: '#0f172a', fontSize: 15, letterSpacing: '-0.02em' }}>{idr(m.balance)}</div>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Revenue: {idr(m.total_sales)}</div>
                  </td>
                  <td style={A.td}>
                    <span style={{ fontSize: 12.5, fontWeight: 500 }}>{m.joined_at && !m.joined_at.startsWith('0001') ? fmtDate(m.joined_at) : 'Awaiting sync'}</span>
                  </td>
                  <td style={{ ...A.td, paddingRight: 24, textAlign: 'right' }}>
                    <button
                      style={A.iconBtn('#4f46e5', '#f0f4ff')}
                      onClick={() => { setModal(m); setNote(''); loadCommission(m.id); }}
                      title="Control Entity"
                    >
                      <i className="bx bx-cog" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          // Mobile Card View
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 0' }}>
            {merchants.length === 0 ? (
              <div style={{ padding: '80px 20px', textAlign: 'center', color: '#94a3b8' }}>
                <i className="bx bx-store-alt" style={{ fontSize: 60, display: 'block', marginBottom: 16, opacity: 0.1 }} />
                <div style={{ fontWeight: 800 }}>No entities detected in this sector.</div>
              </div>
            ) : merchants.map((m) => (
              <div key={m.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: m.logo_url ? `url(${formatImage(m.logo_url)})` : 'linear-gradient(135deg, #4f46e5, #7c3aed)', backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #e2e8f0' }}>
                    {!m.logo_url && <i className="bx bxs-store-alt" style={{ color: '#fff', fontSize: 20 }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 14, marginBottom: 4 }}>{m.store_name}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', wordBreak: 'break-word' }}>ID: {m.id?.slice(0, 8)}</div>
                  </div>
                  <button
                    style={A.iconBtn('#4f46e5', '#f0f4ff')}
                    onClick={() => { setModal(m); setNote(''); loadCommission(m.id); }}
                    title="Control Entity"
                  >
                    <i className="bx bx-cog" />
                  </button>
                </div>

                {/* Status Badges */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  <div style={statusBadge(m.status)}>{m.status?.toUpperCase()}</div>
                  <div style={{ ...statusBadge(m.is_verified ? 'verified' : 'draft'), borderRadius: 8, padding: '6px 10px', fontSize: 10 }}>
                    <i className={`bx ${m.is_verified ? 'bxs-badge-check' : 'bx-badge'}`} style={{ fontSize: 14 }} />
                    {m.is_verified ? 'VERIFIED' : 'PENDING'}
                  </div>
                </div>

                {/* Info Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, marginBottom: 4 }}>BALANCE</div>
                    <div style={{ fontWeight: 900, color: '#0f172a', fontSize: 14 }}>{idr(m.balance)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, marginBottom: 4 }}>REVENUE</div>
                    <div style={{ fontWeight: 900, color: '#0f172a', fontSize: 14 }}>{idr(m.total_sales)}</div>
                  </div>
                </div>

                {/* Timeline */}
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>
                    {m.joined_at && !m.joined_at.startsWith('0001') ? fmtDate(m.joined_at) : 'Awaiting sync'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </TablePanel>

      {modal && (
        <Modal title="Panel Kendali Merchant" onClose={() => setModal(null)} wide>
          {/* Safety Buffer for Header Clipping */}
          <div style={{ height: 4 }} /> 
          
          {/* Identity Card (User-style) with Safe Margin */}
          <div style={{ display: 'flex', marginTop: 12, alignItems: 'center', gap: 20, marginBottom: 24, padding: 20, background: '#f8fafc', borderRadius: 16, border: '1px solid #f1f5f9', position: 'relative' }}>
            <div style={{ 
              width: 60, height: 60, borderRadius: 14, flexShrink: 0,
              background: modal.logo_url ? `url(${formatImage(modal.logo_url)})` : 'linear-gradient(135deg, #4f46e5, #7c3aed)', 
              backgroundSize: 'cover', backgroundPosition: 'center',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid #fff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}>
              {!modal.logo_url && <i className="bx bxs-store-alt" style={{ color: '#fff', fontSize: 24 }} />}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 16, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{modal.store_name}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 6 }}>TENANT-ID: <span style={{ color: '#4f46e5' }}>{modal.id?.slice(0, 16)}...</span></div>
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={{ ...statusBadge(modal.status), fontSize: 10, padding: '3px 8px' }}>{modal.status?.toUpperCase()}</span>
                {modal.is_verified && <span style={{ ...statusBadge('verified'), fontSize: 10, padding: '3px 8px' }}><i className="bx bxs-badge-check" /> TERVERIFIKASI</span>}
              </div>
            </div>
          </div>

          {/* Stats Summary (Simplified) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Omzet', val: idr(modal.total_sales), color: '#10b981' },
              { label: 'Saldo', val: idr(modal.balance), color: '#4f46e5' },
              { label: 'Lama Bergabung', val: modal.joined_at && !modal.joined_at.startsWith('0001') ? fmtDate(modal.joined_at) : 'Mitra Baru', color: '#64748b' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', padding: '12px 8px', borderRadius: 12, border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 12, fontWeight: 900, color: s.color }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Operational Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20, marginBottom: 24 }}>
            {/* Status & Reasoning */}
            <div>
              <FieldLabel>Status Entitas</FieldLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 12 }}>
                {[
                  { id: 'active', label: 'Aktif' },
                  { id: 'pending', label: 'Pending' },
                  { id: 'suspended', label: 'Blokir' }
                ].map(s => (
                  <button key={s.id}
                    onClick={() => updateStatus(modal.id, s.id)}
                    style={{
                      padding: '10px 4px', borderRadius: 10, border: 'none', cursor: 'pointer',
                      fontWeight: 800, fontSize: 10, textTransform: 'uppercase',
                      background: modal.status === s.id ? (s.id === 'active' ? '#10b981' : s.id === 'pending' ? '#f59e0b' : '#ef4444') : '#f1f5f9',
                      color: modal.status === s.id ? '#fff' : '#64748b',
                      transition: 'all 0.2s'
                    }}
                  >{s.label}</button>
                ))}
              </div>
              <textarea
                style={{ ...A.textarea, minHeight: 80, fontSize: 12, padding: 12, background: '#fff', border: '1px solid #e2e8f0' }}
                placeholder="Alasan perubahan status..."
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>

            {/* Commissions & Verify */}
            <div>
              <FieldLabel>Pengaturan Platform</FieldLabel>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="number"
                    value={commission.fee_percent}
                    onChange={e => setCommission({ ...commission, fee_percent: e.target.value })}
                    style={{ ...A.input, padding: '10px 12px', fontSize: 14, flex: 1 }}
                    placeholder="Fee %"
                  />
                  <button onClick={saveCommission} disabled={commission.loading} style={{ ...A.btnPrimary, padding: '0 16px', fontSize: 12 }}>Simpan</button>
                </div>
                <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>Tarif fee layanan khusus untuk entitas ini.</p>
              </div>

              <button
                onClick={() => toggleVerify(modal.id, modal.is_verified)}
                disabled={verifying}
                style={{
                  ...A.btnGhost, width: '100%', justifyContent: 'center', padding: '12px', fontSize: 12,
                  borderColor: modal.is_verified ? '#64748b' : '#10b981',
                  color: modal.is_verified ? '#64748b' : '#10b981',
                  marginBottom: 16,
                  opacity: verifying ? 0.6 : 1,
                  cursor: verifying ? 'not-allowed' : 'pointer'
                }}
              >
                {verifying ? (
                  <div style={{ width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                ) : (
                  <i className={`bx ${modal.is_verified ? 'bxs-badge-check' : 'bx-badge'}`} />
                )}
                {verifying ? 'Memproses...' : (modal.is_verified ? 'Cabut Verifikasi' : 'Berikan Label Terverifikasi')}
              </button>

              <div style={{ marginTop: 8, padding: 16, background: '#f8fafc', borderRadius: 14, border: '1px solid #e2e8f0' }}>
                <FieldLabel>Area Logistik Biteship</FieldLabel>
                <div style={{ position: 'relative' }}>
                  <input 
                    style={{ ...A.input, padding: '10px 12px', fontSize: 12 }} 
                    placeholder="Cari Kecamatan..." 
                    value={searchInput}
                    onChange={e => handleSearchArea(e.target.value)}
                  />
                  {searchingArea && <div style={{ position: 'absolute', right: 10, top: 12, fontSize: 10, color: '#4f46e5' }}>Mencari...</div>}
                  
                  {areas.length > 0 && (
                    <div style={{ position: 'absolute', zIndex: 100, left: 0, right: 0, top: '100%', mt: 4, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', maxH: 200, overflowY: 'auto' }}>
                      {areas.map(a => (
                        <div key={a.id} onClick={() => updateMerchantArea(a)} style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: 11 }}>
                          <div style={{ fontWeight: 800 }}>{a.name}</div>
                          <div style={{ color: '#64748b' }}>
                            {a.administrative_division_level_2_name || a.city_name || ''}, {a.administrative_division_level_1_name || a.province_name || ''} ({a.postal_code || '-'})
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {modal.biteship_area_id ? (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className="bx bxs-map-pin" /> AREA-ID: {modal.biteship_area_id}
                    </div>
                    {modal.area_name && (
                      <div style={{ marginTop: 8, fontSize: 11, background: '#f0fdf4', padding: '8px 12px', borderRadius: 8, border: '1px solid #dcfce7', color: '#14532d' }}>
                        <div style={{ fontWeight: 800 }}>{modal.area_name}</div>
                        <div style={{ fontSize: 10, color: '#166534', marginTop: 2 }}>
                          {modal.city}, {modal.province}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ marginTop: 10, fontSize: 11, fontWeight: 700, color: '#f59e0b' }}>
                    <i className="bx bx-error-circle" /> Area logistik belum dikonfigurasi
                  </div>
                )}
              </div>


            </div>
          </div>

          {/* Banner (Optional) */}
          {modal.banner_url && (
            <div style={{ marginBottom: 24, height: 100, borderRadius: 16, background: `url(${formatImage(modal.banner_url)})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.8 }} />
          )}

          {/* Modal Footer Actions (User-style) */}
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'center' }}>
             <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>Entitas Merchant terdaftar sejak {fmtDate(modal.created_at)}</p>
             <button
                style={{ ...A.btnPrimary, width: '100%', justifyContent: 'center', padding: '12px', background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}
                onClick={() => setModal(null)}
             >
                Tutup Panel Kendali
             </button>
          </div>
        </Modal>
      )}
    </div>
  );
}