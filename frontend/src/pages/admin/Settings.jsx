import React, { useState, useEffect } from 'react';

const API = 'http://localhost:8080/api/admin';

const DEFAULT_CONFIGS = [
  // Platform
  { key: 'platform_name',           value: 'SahabatMart',  description: 'Nama platform',            group: 'platform' },
  { key: 'platform_maintenance',    value: 'false',        description: 'Mode Pemeliharaan (Maintenance)', group: 'platform' },
  { key: 'platform_maint_msg',      value: 'Kami sedang melakukan pemeliharaan rutin.', description: 'Pesan Maintenance', group: 'platform' },
  { key: 'platform_fee_default',    value: '0.05',         description: 'Fee default platform (%)', group: 'platform' },
  { key: 'platform_currency',       value: 'IDR',          description: 'Mata uang',                 group: 'platform' },
  { key: 'platform_min_order',      value: '10000',        description: 'Minimum order (Rp)',        group: 'platform' },
  // Payout
  { key: 'payout_min_amount',       value: '50000',        description: 'Minimum payout (Rp)',       group: 'payout' },
  { key: 'payout_schedule',         value: 'weekly',       description: 'Jadwal payout (daily/weekly/monthly)', group: 'payout' },
  { key: 'payout_day',              value: 'monday',       description: 'Hari payout (weekly)',      group: 'payout' },
  { key: 'payout_bank_code',        value: '',             description: 'Kode bank default',         group: 'payout' },
  // Payment
  { key: 'payment_gateway',         value: 'midtrans',     description: 'Payment gateway aktif',     group: 'payment' },
  { key: 'payment_midtrans_key',    value: '',             description: 'Midtrans Server Key',       group: 'payment' },
  { key: 'payment_sandbox_mode',    value: 'true',         description: 'Mode sandbox',              group: 'payment' },
  { key: 'payment_timeout_minutes', value: '60',           description: 'Timeout pembayaran (menit)', group: 'payment' },
  // Notification
  { key: 'notif_email_enabled',     value: 'true',         description: 'Email notifikasi aktif',   group: 'notification' },
  { key: 'notif_wa_enabled',        value: 'false',        description: 'WhatsApp notifikasi aktif', group: 'notification' },
  { key: 'notif_smtp_host',         value: '',             description: 'SMTP Host',                 group: 'notification' },
  { key: 'notif_smtp_port',         value: '587',          description: 'SMTP Port',                 group: 'notification' },
];

const groupIcons = {
  platform:     { icon: 'bi-globe',          label: 'Platform',     color: '#4361ee' },
  payout:       { icon: 'bi-wallet2',         label: 'Payout',       color: '#f4a261' },
  payment:      { icon: 'bi-credit-card',     label: 'Pembayaran',   color: '#06d6a0' },
  notification: { icon: 'bi-bell',            label: 'Notifikasi',   color: '#7209b7' },
};

export default function AdminSettings() {
  const [configs, setConfigs]   = useState([]);
  const [editing, setEditing]   = useState({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState('');
  const [activeGroup, setGroup] = useState('platform');

  useEffect(() => {
    fetch(API + '/settings')
      .then(r => r.json())
      .then(d => {
        const saved = d.data || [];
        // Merge defaults dengan yang sudah ada di DB
        const merged = DEFAULT_CONFIGS.map(def => {
          const found = saved.find(s => s.key === def.key);
          return found || def;
        });
        setConfigs(merged);
        // Populate editing state
        const ed = {};
        merged.forEach(c => { ed[c.key] = c.value; });
        setEditing(ed);
      })
      .catch(() => {
        setConfigs(DEFAULT_CONFIGS);
        const ed = {};
        DEFAULT_CONFIGS.forEach(c => { ed[c.key] = c.value; });
        setEditing(ed);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key, val) => {
    setEditing(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = () => {
    setSaving(true);
    const payload = Object.keys(editing).map(key => {
      const found = configs.find(c => c.key === key);
      return { key, value: editing[key], description: found?.description || '' };
    });

    fetch(API + '/settings/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(() => {
      setMsg('Pengaturan berhasil disimpan!');
      setTimeout(() => setMsg(''), 3000);
    }).catch(() => {
      setMsg('Gagal menyimpan, coba lagi.');
      setTimeout(() => setMsg(''), 3000);
    }).finally(() => setSaving(false));
  };

  const groups = [...new Set(DEFAULT_CONFIGS.map(c => c.group))];
  const filteredConfigs = configs.filter(c => c.group === activeGroup);

  const renderInput = (cfg) => {
    const val = editing[cfg.key] ?? cfg.value;
    // Boolean toggle
    if (['true', 'false'].includes(cfg.value)) {
      return (
        <div className="form-check form-switch">
          <input className="form-check-input" type="checkbox" id={cfg.key}
            checked={val === 'true' || val === true}
            onChange={e => handleChange(cfg.key, e.target.checked ? 'true' : 'false')} />
        </div>
      );
    }
    // Dropdown untuk schedule
    if (cfg.key === 'payout_schedule') {
      return (
        <select className="form-select form-select-sm" value={val}
          onChange={e => handleChange(cfg.key, e.target.value)}>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      );
    }
    // Password/key fields
    if (cfg.key.includes('key') || cfg.key.includes('secret')) {
      return (
        <input type="password" className="form-control form-control-sm" value={val}
          onChange={e => handleChange(cfg.key, e.target.value)}
          placeholder={`Masukkan ${cfg.description}`} />
      );
    }
    return (
      <input type="text" className="form-control form-control-sm" value={val}
        onChange={e => handleChange(cfg.key, e.target.value)} />
    );
  };

  return (
    <>
      <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
        <div className="breadcrumb-title pe-3">Super Admin</div>
        <div className="ps-3"><nav><ol className="breadcrumb mb-0 p-0">
          <li className="breadcrumb-item active">Pengaturan Platform</li>
        </ol></nav></div>
      </div>

      {msg && (
        <div className={`alert py-2 mb-3 ${msg.includes('Gagal') ? 'alert-danger' : 'alert-success'}`}>
          <i className={`bi ${msg.includes('Gagal') ? 'bi-exclamation-circle' : 'bi-check-circle'} me-2`}></i>{msg}
        </div>
      )}

      <div className="row g-4">
        {/* Group Nav */}
        <div className="col-12 col-lg-3">
          <div className="card radius-10">
            <div className="card-body p-2">
              <p className="text-muted small px-2 mb-2 mt-1">Grup Pengaturan</p>
              {groups.map(g => {
                const gi = groupIcons[g] || { icon: 'bi-gear', label: g, color: '#888' };
                return (
                  <button key={g}
                    className={`w-100 text-start btn btn-sm mb-1 d-flex align-items-center gap-2 ${activeGroup === g ? 'btn-primary' : 'btn-light'}`}
                    onClick={() => setGroup(g)}
                    style={{ borderRadius: 8, padding: '8px 12px' }}>
                    <i className={`bi ${gi.icon}`} style={{ color: activeGroup === g ? '#fff' : gi.color }}></i>
                    <span>{gi.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Settings Panel */}
        <div className="col-12 col-lg-9">
          <div className="card radius-10">
            <div className="card-body">
              {loading ? (
                <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
              ) : (
                <>
                  <div className="d-flex align-items-center gap-2 mb-4">
                    <i className={`bi ${groupIcons[activeGroup]?.icon || 'bi-gear'} fs-5`}
                      style={{ color: groupIcons[activeGroup]?.color }}></i>
                    <h6 className="mb-0 fw-semibold">{groupIcons[activeGroup]?.label || activeGroup}</h6>
                  </div>

                  <div className="row g-3">
                    {filteredConfigs.map(cfg => (
                      <div key={cfg.key} className="col-12 col-md-6">
                        <label className="form-label small fw-medium mb-1">
                          {cfg.description}
                          <code className="ms-2 text-muted" style={{ fontSize: 10 }}>{cfg.key}</code>
                        </label>
                        {renderInput(cfg)}
                      </div>
                    ))}
                  </div>

                  <hr className="my-4" />
                  <div className="d-flex justify-content-end">
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                      {saving
                        ? <><span className="spinner-border spinner-border-sm me-2"></span>Menyimpan...</>
                        : <><i className="bi bi-floppy me-2"></i>Simpan Pengaturan</>}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
