import React, { useState, useEffect } from 'react';
import { API_BASE, AUTH_API_BASE, ADMIN_API_BASE, fetchJson } from '../../lib/api';

const API = ADMIN_API_BASE;

const DEFAULT_CONFIGS = [
  { key: 'platform_name',           value: 'AkuGlow',      description: 'Nama Platform',              group: 'platform',  type: 'text' },
  { key: 'platform_maintenance',    value: 'false',            description: 'Mode Pemeliharaan',           group: 'platform',  type: 'bool' },
  { key: 'platform_maint_msg',      value: 'Sedang maintenance.', description: 'Pesan Maintenance',       group: 'platform',  type: 'text' },
  { key: 'default_platform_fee',    value: '5',                description: 'Fee Layanan Merchant (Platform Fee) (%)',   group: 'platform',  type: 'number' },
  { key: 'default_affiliate_commission', value: '10',          description: 'Komisi Afiliasi Default (%)',               group: 'platform',  type: 'number' },
  { key: 'platform_currency',       value: 'IDR',              description: 'Mata Uang',                  group: 'platform',  type: 'text' },
  { key: 'platform_min_order',      value: '10000',            description: 'Minimum Order (Rp)',         group: 'platform',  type: 'number' },
  { key: 'merchant_min_active_mitra',  value: '100',          description: 'Min. Mitra Aktif (Merchant)', group: 'platform',  type: 'number' },
  { key: 'merchant_min_team_turnover', value: '10000000',     description: 'Min. Omset Tim (Merchant)',  group: 'platform',  type: 'number' },
  { key: 'payout_min_amount',       value: '50000',            description: 'Minimum Payout (Rp)',        group: 'payout',    type: 'number' },
  { key: 'payout_schedule',         value: 'weekly',           description: 'Jadwal Payout',              group: 'payout',    type: 'select', options: ['daily', 'weekly', 'monthly'] },
  { key: 'payout_day',              value: 'friday',           description: 'Hari Payout (jika weekly)',  group: 'payout',    type: 'select', options: ['monday','tuesday','wednesday','thursday','friday'] },
  { key: 'payout_bank_code',        value: '',                 description: 'Kode Bank Default',          group: 'payout',    type: 'text' },
  { key: 'payment_gateway',         value: 'tripay',           description: 'Payment Gateway Aktif',      group: 'payment',   type: 'select', options: ['tripay', 'midtrans', 'xendit'] },
  { key: 'payment_tripay_merchant', value: '',                 description: 'Tripay Merchant Code',       group: 'payment',   type: 'text' },
  { key: 'payment_tripay_key',      value: '',                 description: 'Tripay API Key',              group: 'payment',   type: 'secret' },
  { key: 'payment_tripay_private',  value: '',                 description: 'Tripay Private Key',          group: 'payment',   type: 'secret' },
  { key: 'payment_tripay_url',      value: 'https://tripay.co.id/api-sandbox', description: 'Tripay Base URL', group: 'payment',   type: 'text' },
  { key: 'payment_midtrans_key',    value: '',                 description: 'Midtrans Server Key',        group: 'payment',   type: 'secret' },
  { key: 'payment_sandbox_mode',    value: 'true',             description: 'Mode Sandbox',               group: 'payment',   type: 'bool' },
  { key: 'payment_timeout_minutes', value: '60',               description: 'Timeout Pembayaran (menit)', group: 'payment',   type: 'number' },
  { key: 'notif_email_enabled',     value: 'true',             description: 'Email Notifikasi',           group: 'notification', type: 'bool' },
  { key: 'notif_wa_enabled',        value: 'false',            description: 'WhatsApp Notifikasi',        group: 'notification', type: 'bool' },
  { key: 'notif_smtp_host',         value: '',                 description: 'SMTP Host',                  group: 'notification', type: 'text' },
  { key: 'notif_smtp_port',         value: '587',              description: 'SMTP Port',                  group: 'notification', type: 'number' },
  { key: 'notif_smtp_user',         value: '',                 description: 'SMTP Username/Email',        group: 'notification', type: 'text' },
  { key: 'notif_smtp_pass',         value: '',                 description: 'SMTP Password',              group: 'notification', type: 'secret' },
  // Skin AI Analyzer
  { key: 'skin_ai_enabled',         value: 'false',            description: 'Aktifkan AI Skin Analyzer',  group: 'skin_ai',   type: 'bool' },
  { key: 'skin_ai_openai_key',      value: '',                 description: 'OpenAI API Key',             group: 'skin_ai',   type: 'secret' },
  { key: 'skin_ai_model',           value: 'gpt-4o',           description: 'Model AI yang digunakan',    group: 'skin_ai',   type: 'select', options: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'] },
  { key: 'skin_ai_prompt',          value: '',                 description: 'Prompt Kustom (opsional, kosong = default)', group: 'skin_ai', type: 'textarea' },
  { key: 'skin_journey_day25_voucher', value: 'AKUGLOW25',     description: 'Kode Voucher Reward Hari ke-25', group: 'skin_ai', type: 'text' },
  // Statistics
  { key: 'stats_years_exp',         value: '5+',           description: 'Tahun Pengalaman',           group: 'stats',     type: 'text' },
  { key: 'stats_products_sold',     value: '20K+',          description: 'Produk Terjual',             group: 'stats',     type: 'text' },
  { key: 'stats_satisfied_users',    value: '7M+',           description: 'Pengguna Puas',              group: 'stats',     type: 'text' },
  { key: 'stats_official_stores',    value: '4+',           description: 'Mitra Toko Resmi',           group: 'stats',     type: 'text' },
  // Contact Information
  { key: 'contact_address',         value: 'Jl. Sudirman No. 123, Jakarta Pusat', description: 'Alamat Kantor',          group: 'contact',   type: 'text' },
  { key: 'contact_phone',           value: '+62 21 1234 5678', description: 'Nomor Telepon',           group: 'contact',   type: 'text' },
  { key: 'contact_email',           value: 'support@akuglow.id', description: 'Email Support',            group: 'contact',   type: 'text' },
  { key: 'contact_whatsapp',        value: '+6281234567890',     description: 'Nomor WhatsApp',          group: 'contact',   type: 'text' },
  { key: 'contact_hours',           value: 'Senin - Jumat, 09:00 - 18:00', description: 'Jam Operasional',     group: 'contact',   type: 'text' },
];

const GROUP_META = {
  platform:     { icon: 'bx-globe',       label: 'Platform',      color: '#4361ee' },
  payout:       { icon: 'bx-wallet',      label: 'Payout',        color: '#f59e0b' },
  payment:      { icon: 'bx-credit-card', label: 'Pembayaran',    color: '#10b981' },
  notification: { icon: 'bx-bell',        label: 'Notifikasi',    color: '#8b5cf6' },
  skin_ai:      { icon: 'bx-brain',       label: 'AI Skin Analyzer', color: '#f43f5e' },
  stats:        { icon: 'bx-bar-chart-alt-2', label: 'Statistik Beranda', color: '#0ea5e9' },
  contact:      { icon: 'bx-phone-call',  label: 'Informasi Kontak', color: '#f59e0b' },
  security:     { icon: 'bx-lock-alt',    label: 'Keamanan',      color: '#ef4444' },
};

const S = {
  page: { fontFamily: "'Inter', sans-serif", paddingTop: 20 },
  label: { display: 'block', fontSize: 11.5, fontWeight: 700, color: '#64748b', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: 5 },
  sublabel: { fontSize: 11.5, color: '#94a3b8', marginTop: 3 },
  input: { width: '100%', padding: '9px 13px', borderRadius: 9, border: '1.5px solid #e2e8f0', fontSize: 13.5, color: '#334155', background: '#f8fafc', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border 0.2s' },
  select: { width: '100%', padding: '9px 13px', borderRadius: 9, border: '1.5px solid #e2e8f0', fontSize: 13.5, color: '#334155', background: '#f8fafc', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
};

export default function AdminSettings() {
  const [configs, setConfigs] = useState([]);
  const [editing, setEditing] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeGroup, setActiveGroup] = useState('platform');

  useEffect(() => {
    fetchJson(API + '/configs')
      .then(res => {
        const saved = Array.isArray(res) ? res : (res.data || []);
        const merged = DEFAULT_CONFIGS.map(def => {
          const found = saved.find(s => s.key === def.key);
          return found ? { ...def, ...found, type: def.type, options: def.options } : def;
        });
        setConfigs(merged);
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

  const handleChange = (key, val) => setEditing(prev => ({ ...prev, [key]: val }));

  const handleSave = () => {
    setSaving(true);
    const payload = Object.keys(editing).map(key => {
      const found = configs.find(c => c.key === key);
      return { key, value: editing[key], description: found?.description || '' };
    });
    fetchJson(API + '/configs/upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(() => {
      setToast({ type: 'success', msg: 'Pengaturan berhasil disimpan!' });
      setTimeout(() => setToast(null), 3000);
    }).catch(() => {
      setToast({ type: 'error', msg: 'Gagal menyimpan. Coba lagi.' });
      setTimeout(() => setToast(null), 3000);
    }).finally(() => setSaving(false));
  };

  const renderInput = (cfg) => {
    const val = editing[cfg.key] ?? cfg.value;
    if (cfg.type === 'bool') {
      const isOn = val === 'true' || val === true;
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative', width: 52, height: 28, flexShrink: 0, cursor: 'pointer' }}
            onClick={() => handleChange(cfg.key, isOn ? 'false' : 'true')}>
            <div style={{ width: 52, height: 28, borderRadius: 28, background: isOn ? '#22c55e' : '#e2e8f0', transition: '0.3s' }} />
            <div style={{ position: 'absolute', top: 3, left: isOn ? 26 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', transition: '0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: isOn ? '#16a34a' : '#64748b' }}>{isOn ? 'Aktif' : 'Nonaktif'}</span>
        </div>
      );
    }
    if (cfg.type === 'select') {
      return (
        <select style={S.select} value={val} onChange={e => handleChange(cfg.key, e.target.value)}>
          {cfg.options?.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    if (cfg.type === 'secret') {
      return (
        <input style={S.input} type="password" value={val} placeholder={`Masukkan ${cfg.description}...`}
          onChange={e => handleChange(cfg.key, e.target.value)}
          onFocus={e => e.target.style.borderColor = '#818cf8'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
      );
    }
    if (cfg.type === 'textarea') {
      return (
        <textarea
          style={{ ...S.input, height: 120, resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}
          value={val}
          placeholder={`Masukkan ${cfg.description}...`}
          onChange={e => handleChange(cfg.key, e.target.value)}
          onFocus={e => e.target.style.borderColor = '#818cf8'}
          onBlur={e => e.target.style.borderColor = '#e2e8f0'}
        />
      );
    }
    return (
      <input style={S.input} type={cfg.type === 'number' ? 'number' : 'text'} value={val}
        onChange={e => handleChange(cfg.key, e.target.value)}
        onFocus={e => e.target.style.borderColor = '#818cf8'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
    );
  };

  const renderSecurity = () => {
    return (
      <div className="animate-fade-in" style={{ padding: 24 }}>
        <div style={{ maxWidth: 400 }}>
          <h4 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Ganti Password Admin</h4>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>Ubah password akun Super Admin Anda untuk keamanan maksimal.</p>
          
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              const oldPass = e.target.old_password.value;
              const newPass = e.target.new_password.value;
              const confirmPass = e.target.confirm_password.value;

              if (newPass !== confirmPass) return alert('Konfirmasi password tidak cocok');
              if (newPass.length < 6) return alert('Password minimal 6 karakter');
              
              setSaving(true);
              try {
                await fetchJson(`${API_BASE}/api/auth/change-password`, {
                  method: 'POST',
                  body: JSON.stringify({ old_password: oldPass, new_password: newPass })
                });
                alert('Password berhasil diubah!');
                e.target.reset();
              } catch (err) {
                alert(err.message);
              } finally {
                setSaving(false);
              }
            }}
          >
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Password Lama</label>
              <input style={S.input} type="password" name="old_password" required />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Password Baru</label>
              <input style={S.input} type="password" name="new_password" required minLength={6} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={S.label}>Konfirmasi Password Baru</label>
              <input style={S.input} type="password" name="confirm_password" required />
            </div>
            
            <button 
              type="submit" 
              disabled={saving}
              style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: '#0f172a', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
            >
              {saving ? 'Memproses...' : 'Perbarui Password'}
            </button>
          </form>
        </div>
      </div>
    );
  };

  const groups = [...new Set(DEFAULT_CONFIGS.map(c => c.group)), 'security'];
  const filtered = configs.filter(c => c.group === activeGroup);
  const gm = GROUP_META[activeGroup];

  return (
    <div style={S.page} className="fade-in">
      {/* Breadcrumb */}
      <div className="d-none d-sm-flex align-items-center gap-2 mb-4">
        <span style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Konfigurasi</span>
        <i className="bx bx-chevron-right" style={{ color: '#cbd5e1', fontSize: 20 }} />
        <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 500 }}>Pengaturan Platform</span>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, padding: '14px 20px', borderRadius: 12, background: toast.type === 'success' ? '#d1fae5' : '#ffe4e6', color: toast.type === 'success' ? '#065f46' : '#9f1239', fontSize: 13.5, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className={`bx ${toast.type === 'success' ? 'bx-check-circle' : 'bx-error-circle'}`} style={{ fontSize: 20 }} />
          {toast.msg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Sidebar Nav */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0f0f5', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden', position: 'sticky', top: 20 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Grup Konfigurasi</div>
          </div>
          <div style={{ padding: 8 }}>
            {groups.map(g => {
              const m = GROUP_META[g];
              const active = activeGroup === g;
              return (
                <button key={g} onClick={() => setActiveGroup(g)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', marginBottom: 2, background: active ? m.color + '15' : 'transparent', transition: 'all 0.15s' }}>
                  <i className={`bx ${m.icon}`} style={{ fontSize: 20, color: active ? m.color : '#94a3b8' }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: active ? m.color : '#475569' }}>{m.label}</span>
                  {active && <i className="bx bx-chevron-right" style={{ fontSize: 18, color: m.color, marginLeft: 'auto' }} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Settings Panel */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0f0f5', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          {/* Panel Header */}
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: gm.color + '15', color: gm.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                <i className={`bx ${gm.icon}`} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Pengaturan {gm.label}</div>
                <div style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 2 }}>{filtered.length} parameter dikonfigurasi</div>
              </div>
            </div>
          </div>

          {/* Config Fields */}
          {activeGroup === 'security' ? renderSecurity() : (
            <div style={{ padding: 24 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div className="spinner-border" style={{ color: '#4361ee', width: 32, height: 32, borderWidth: 3 }} />
                <div style={{ marginTop: 12, fontSize: 13, color: '#94a3b8' }}>Memuat konfigurasi...</div>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: activeGroup === 'skin_ai' ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>
                  {activeGroup === 'skin_ai' && (
                    <div style={{ padding: '14px 18px', borderRadius: 14, background: 'linear-gradient(135deg,#fff1f2,#ffe4e6)', border: '1px solid #fecdd3', marginBottom: 4 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <i className="bx bx-brain" style={{ fontSize: 22, color: '#f43f5e' }} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: '#be123c' }}>AI Skin Analyzer (OpenAI Vision)</div>
                          <div style={{ fontSize: 12, color: '#9f1239', marginTop: 2 }}>Masukkan API Key OpenAI dan aktifkan fitur untuk mulai menganalisis foto kulit pengguna secara real-time.</div>
                        </div>
                      </div>
                    </div>
                  )}
                  {filtered.map(cfg => (
                    <div key={cfg.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={S.label}>{cfg.description}</label>
                      {renderInput(cfg)}
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button onClick={handleSave} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 10, border: 'none', background: '#4361ee', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                    {saving ? <div className="spinner-border spinner-border-sm" style={{ width: 16, height: 16 }} /> : <i className="bx bx-save" style={{ fontSize: 18 }} />}
                    {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                  </button>
                </div>
              </>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
