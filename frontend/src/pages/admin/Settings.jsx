import React, { useState, useEffect } from 'react';
import { API_BASE, AUTH_API_BASE, ADMIN_API_BASE, fetchJson } from '../../lib/api';

const API = ADMIN_API_BASE;

const DEFAULT_CONFIGS = [
  { key: 'platform_name',           value: 'AkuGlow',      description: 'Nama Platform',              group: 'platform',  type: 'text' },
  { key: 'platform_maintenance',    value: 'false',            description: 'Mode Pemeliharaan',           group: 'platform',  type: 'bool' },
  { key: 'platform_maint_msg',      value: 'Sedang maintenance.', description: 'Pesan Maintenance',       group: 'platform',  type: 'text' },
  { key: 'default_platform_fee',    value: '5',                description: 'Fee Layanan Merchant (Platform Fee) (%)',   group: 'platform',  type: 'number' },
  { key: 'default_affiliate_commission', value: '10',          description: 'Komisi Mitra Default (%)',               group: 'platform',  type: 'number' },
  { key: 'affiliate_withdraw_pct',  value: '70',                description: 'Porsi Komisi Bisa Ditarik (%)',            group: 'affiliate', type: 'number' },
  { key: 'affiliate_shopping_pct',  value: '30',                description: 'Porsi Komisi Untuk Belanja (%)',           group: 'affiliate', type: 'number' },
  { key: 'platform_currency',       value: 'IDR',              description: 'Mata Uang',                  group: 'platform',  type: 'text' },
  { key: 'platform_min_order',      value: '10000',            description: 'Minimum Order (Rp)',         group: 'platform',  type: 'number' },
  { key: 'merchant_min_active_mitra',  value: '100',          description: 'Min. Mitra Aktif (Merchant)', group: 'platform',  type: 'number' },
  { key: 'merchant_min_team_turnover', value: '10000000',     description: 'Min. Omset Tim (Merchant)',  group: 'platform',  type: 'number' },
  { key: 'business_opportunity_video_url', value: 'https://www.youtube.com/watch?v=N7VoHAG1QE4', description: 'URL Video Peluang Bisnis (YouTube)', group: 'platform', type: 'text' },
  { key: 'payout_min_amount',       value: '50000',            description: 'Minimum Payout (Rp)',        group: 'payout',    type: 'number' },
  { key: 'payout_schedule',         value: 'weekly',           description: 'Jadwal Payout',              group: 'payout',    type: 'select', options: ['daily', 'weekly', 'monthly'] },
  { key: 'payout_day',              value: 'friday',           description: 'Hari Payout (jika weekly)',  group: 'payout',    type: 'select', options: ['monday','tuesday','wednesday','thursday','friday'] },
  { key: 'payout_payday_dates',     value: '25,30',            description: 'Tanggal Payout (jika monthly, pisahkan dengan koma)', group: 'payout', type: 'text' },
  { key: 'payout_bank_code',        value: '',                 description: 'Kode Bank Default',          group: 'payout',    type: 'text' },
  { key: 'payment_gateway',         value: 'tripay',           description: 'Payment Gateway Aktif',      group: 'payment',   type: 'select', options: ['tripay', 'xendit'] },
  { key: 'payment_tripay_merchant', value: '',                 description: 'Tripay Merchant Code',       group: 'payment',   type: 'text' },
  { key: 'payment_tripay_key',      value: '',                 description: 'Tripay API Key',              group: 'payment',   type: 'secret' },
  { key: 'payment_tripay_private',  value: '',                 description: 'Tripay Private Key',          group: 'payment',   type: 'secret' },
  { key: 'payment_tripay_url',      value: 'https://tripay.co.id/api-sandbox', description: 'Tripay Base URL', group: 'payment',   type: 'text' },
  { key: 'payment_sandbox_mode',    value: 'true',             description: 'Mode Sandbox',               group: 'payment',   type: 'bool' },
  { key: 'payment_timeout_minutes', value: '60',               description: 'Timeout Pembayaran (menit)', group: 'payment',   type: 'number' },
  // Manual Transfer
  { key: 'payment_manual_transfer_enabled', value: 'false',   description: 'Aktifkan Transfer Manual',    group: 'payment',   type: 'bool' },
  { key: 'payment_manual_bank_name',        value: '',         description: 'Nama Bank (Transfer Manual)', group: 'payment',   type: 'text' },
  { key: 'payment_manual_account_number',   value: '',         description: 'Nomor Rekening',              group: 'payment',   type: 'text' },
  { key: 'payment_manual_account_holder',   value: '',         description: 'Nama Pemilik Rekening',       group: 'payment',   type: 'text' },
  { key: 'payment_manual_instructions',     value: '',         description: 'Instruksi Tambahan (Transfer Manual)', group: 'payment', type: 'textarea' },
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
  platform:     { icon: 'bx-globe',       label: 'Platform',      desc: 'Pengaturan dasar aplikasi dan fee' },
  payout:       { icon: 'bx-wallet',      label: 'Payout',        desc: 'Jadwal dan batas penarikan komisi' },
  payment:      { icon: 'bx-credit-card', label: 'Pembayaran',    desc: 'Payment gateway dan transfer bank' },
  notification: { icon: 'bx-bell',        label: 'Notifikasi',    desc: 'Pengaturan SMTP dan pemberitahuan' },
  skin_ai:      { icon: 'bx-brain',       label: 'AI Skin',       desc: 'Integrasi OpenAI Vision' },
  stats:        { icon: 'bx-bar-chart-alt-2', label: 'Statistik', desc: 'Angka metrik beranda' },
  contact:      { icon: 'bx-phone-call',  label: 'Kontak',        desc: 'Informasi kontak perusahaan' },
  security:     { icon: 'bx-lock-alt',    label: 'Keamanan',      desc: 'Ganti password admin' },
  affiliate:    { icon: 'bx-share-alt',   label: 'Afiliasi',      desc: 'Pengaturan komisi afiliasi' },
};

export default function AdminSettings() {
  const [configs, setConfigs] = useState([]);
  const [editing, setEditing] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeGroup, setActiveGroup] = useState('platform');
  const [testEmail, setTestEmail] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const handleTestEmail = () => {
    if (!testEmail) return;
    setTestingEmail(true);
    fetchJson(API + '/configs/test-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: testEmail }),
    }).then(res => {
      showToast('success', res.message || 'Email uji coba berhasil dikirim!');
    }).catch(err => {
      showToast('error', err.message || 'Gagal mengirim email uji coba.');
    }).finally(() => setTestingEmail(false));
  };

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
      showToast('success', 'Konfigurasi berhasil disimpan!');
    }).catch(() => {
      showToast('error', 'Gagal menyimpan konfigurasi.');
    }).finally(() => setSaving(false));
  };

  const renderInput = (cfg) => {
    const val = editing[cfg.key] ?? cfg.value;
    if (cfg.type === 'bool') {
      const isOn = val === 'true' || val === true;
      return (
        <div className="toggle-wrapper" onClick={() => handleChange(cfg.key, isOn ? 'false' : 'true')}>
          <div className={`toggle-switch ${isOn ? 'active' : ''}`}>
            <div className="toggle-thumb" />
          </div>
          <span className="toggle-label">{isOn ? 'Aktif' : 'Nonaktif'}</span>
        </div>
      );
    }
    if (cfg.type === 'select') {
      return (
        <select className="form-select" value={val} onChange={e => handleChange(cfg.key, e.target.value)}>
          {cfg.options?.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    if (cfg.type === 'secret') {
      return (
        <input className="form-input" type="password" value={val} placeholder={`Masukkan ${cfg.description}...`} onChange={e => handleChange(cfg.key, e.target.value)} />
      );
    }
    if (cfg.type === 'textarea') {
      return (
        <textarea className="form-textarea" value={val} placeholder={`Masukkan ${cfg.description}...`} onChange={e => handleChange(cfg.key, e.target.value)} />
      );
    }
    return (
      <input className="form-input" type={cfg.type === 'number' ? 'number' : 'text'} value={val} placeholder={`Masukkan ${cfg.description}...`} onChange={e => handleChange(cfg.key, e.target.value)} />
    );
  };

  const renderSecurity = () => {
    return (
      <div className="form-grid">
        <div className="form-group full-width" style={{ maxWidth: 460 }}>
          <div style={{ marginBottom: 24 }}>
            <h4 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>Ganti Password Admin</h4>
            <p style={{ fontSize: 14, color: '#64748b' }}>Ubah password akun Super Admin Anda secara berkala untuk menjaga keamanan platform.</p>
          </div>
          
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              const oldPass = e.target.old_password.value;
              const newPass = e.target.new_password.value;
              const confirmPass = e.target.confirm_password.value;

              if (newPass !== confirmPass) return showToast('error', 'Konfirmasi password tidak cocok');
              if (newPass.length < 6) return showToast('error', 'Password minimal 6 karakter');
              
              setSaving(true);
              try {
                await fetchJson(`${API_BASE}/api/auth/change-password`, {
                  method: 'POST',
                  body: JSON.stringify({ old_password: oldPass, new_password: newPass })
                });
                showToast('success', 'Password berhasil diubah!');
                e.target.reset();
              } catch (_err) {
                showToast('error', _err.message || 'Gagal mengubah password');
              } finally {
                setSaving(false);
              }
            }}
          >
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Password Lama</label>
              <input className="form-input" type="password" name="old_password" required />
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Password Baru</label>
              <input className="form-input" type="password" name="new_password" required minLength={6} />
            </div>
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="form-label">Konfirmasi Password Baru</label>
              <input className="form-input" type="password" name="confirm_password" required />
            </div>
            
            <button type="submit" disabled={saving} className="btn-primary" style={{ width: '100%' }}>
              {saving ? <div className="spinner" /> : <i className="bx bx-lock-alt" />}
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
    <div className="settings-container">
      <style>{`
        .settings-container {
          max-width: 1100px;
          margin: 0 auto;
          padding: 16px 0;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #0f172a;
          animation: fadeIn 0.4s ease-out;
        }
        .settings-header {
          margin-bottom: 32px;
        }
        .settings-title {
          font-size: 28px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 6px;
          letter-spacing: -0.5px;
        }
        .settings-subtitle {
          font-size: 15px;
          color: #64748b;
        }
        .settings-layout {
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: 32px;
          align-items: start;
        }
        .settings-nav {
          position: sticky;
          top: 24px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 12px;
          border: none;
          background: transparent;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s ease;
          color: #64748b;
          font-weight: 600;
          font-size: 14px;
        }
        .nav-item:hover {
          background: #f8fafc;
          color: #0f172a;
        }
        .nav-item.active {
          background: #eff6ff;
          color: #2563eb;
        }
        .nav-item .nav-icon {
          font-size: 20px;
          color: #94a3b8;
          transition: color 0.2s;
        }
        .nav-item.active .nav-icon {
          color: #2563eb;
        }
        .settings-panel {
          background: #ffffff;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05);
        }
        .panel-header {
          padding: 24px 32px;
          border-bottom: 1px solid #f1f5f9;
          background: #fafafa;
          border-radius: 20px 20px 0 0;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .panel-header-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: #eff6ff;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }
        .panel-title {
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
        }
        .panel-desc {
          font-size: 14px;
          color: #64748b;
          margin-top: 4px;
        }
        .panel-body {
          padding: 32px;
        }
        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 24px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .form-group.full-width {
          grid-column: 1 / -1;
        }
        .form-label {
          font-size: 13.5px;
          font-weight: 600;
          color: #334155;
        }
        .form-input, .form-select, .form-textarea {
          width: 100%;
          padding: 12px 16px;
          border-radius: 12px;
          border: 1.5px solid #e2e8f0;
          font-size: 14px;
          color: #0f172a;
          background: #f8fafc;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .form-input:focus, .form-select:focus, .form-textarea:focus {
          outline: none;
          border-color: #3b82f6;
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }
        .form-textarea {
          resize: vertical;
          min-height: 100px;
        }
        .toggle-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .toggle-switch {
          position: relative;
          width: 52px;
          height: 28px;
          border-radius: 28px;
          background: #cbd5e1;
          cursor: pointer;
          transition: background 0.3s ease;
        }
        .toggle-switch.active {
          background: #10b981;
        }
        .toggle-thumb {
          position: absolute;
          top: 3px;
          left: 3px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #ffffff;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .toggle-switch.active .toggle-thumb {
          transform: translateX(24px);
        }
        .toggle-label {
          font-size: 14px;
          font-weight: 600;
          color: #475569;
        }
        .toggle-switch.active + .toggle-label {
          color: #10b981;
        }
        .panel-footer {
          padding: 24px 32px;
          border-top: 1px solid #f1f5f9;
          background: #fafafa;
          border-radius: 0 0 20px 20px;
          display: flex;
          justify-content: flex-end;
        }
        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 28px;
          border-radius: 12px;
          border: none;
          background: #0f172a;
          color: #ffffff;
          font-size: 14.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.2);
        }
        .btn-primary:hover {
          background: #1e293b;
          transform: translateY(-1px);
        }
        .btn-primary:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }
        .toast-container {
          position: fixed;
          bottom: 32px;
          right: 32px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .toast {
          padding: 16px 24px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          font-size: 14.5px;
          font-weight: 600;
        }
        .toast.success { background: #10b981; color: #ffffff; }
        .toast.error { background: #ef4444; color: #ffffff; }
        .spinner {
          width: 18px;
          height: 18px;
          border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp {
          0% { transform: translateY(40px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Specific Sections */
        .ai-banner {
          grid-column: 1 / -1;
          padding: 24px;
          border-radius: 16px;
          background: linear-gradient(135deg, #fff1f2, #ffe4e6);
          border: 1px solid #fecdd3;
          display: flex;
          gap: 16px;
          align-items: center;
          margin-bottom: 8px;
        }
        .ai-banner-icon {
          font-size: 32px;
          color: #e11d48;
          background: #fff;
          padding: 12px;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(225, 29, 72, 0.1);
        }
        .manual-transfer-card {
          grid-column: 1 / -1;
          border: 1.5px solid #e2e8f0;
          border-radius: 16px;
          overflow: hidden;
          margin-top: 12px;
        }
        .manual-transfer-header {
          padding: 20px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f8fafc;
          transition: all 0.3s ease;
        }
        .manual-transfer-header.active {
          background: #eff6ff;
          border-bottom: 1.5px solid #bfdbfe;
        }
        .preview-card {
          grid-column: 1 / -1;
          padding: 24px;
          border-radius: 16px;
          background: linear-gradient(135deg, #1e293b, #0f172a);
          color: #ffffff;
          display: flex;
          align-items: center;
          gap: 20px;
          margin-top: 12px;
          box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.3);
        }
        .test-email-card {
          grid-column: 1 / -1;
          margin-top: 16px;
          padding: 24px;
          border-radius: 16px;
          background: #f8fafc;
          border: 1.5px dashed #cbd5e1;
        }

        @media (max-width: 768px) {
          .settings-layout {
            grid-template-columns: 1fr;
            gap: 24px;
          }
          .settings-nav {
            flex-direction: row;
            overflow-x: auto;
            padding-bottom: 8px;
            position: static;
          }
          .nav-item {
            flex-shrink: 0;
          }
          .panel-header { padding: 20px; }
          .panel-body { padding: 20px; }
          .panel-footer { padding: 20px; }
        }
      `}</style>

      {/* Header */}
      <div className="settings-header">
        <h1 className="settings-title">Konfigurasi Sistem</h1>
        <p className="settings-subtitle">Kelola pengaturan utama, pembayaran, afiliasi, dan performa platform Anda.</p>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            <i className={`bx ${toast.type === 'success' ? 'bx-check-circle' : 'bx-error-circle'}`} style={{ fontSize: 24 }} />
            <span>{toast.msg}</span>
          </div>
        </div>
      )}

      <div className="settings-layout">
        {/* Sidebar Nav */}
        <div className="settings-nav">
          {groups.map(g => {
            const m = GROUP_META[g];
            const active = activeGroup === g;
            return (
              <button 
                key={g} 
                onClick={() => setActiveGroup(g)} 
                className={`nav-item ${active ? 'active' : ''}`}
              >
                <i className={`bx ${m.icon} nav-icon`} />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Panel */}
        <div className="settings-panel">
          <div className="panel-header">
            <div className="panel-header-icon">
              <i className={`bx ${gm.icon}`} />
            </div>
            <div>
              <h2 className="panel-title">{gm.label}</h2>
              <p className="panel-desc">{gm.desc}</p>
            </div>
          </div>

          <div className="panel-body">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div className="spinner" style={{ borderColor: '#e2e8f0', borderTopColor: '#2563eb', margin: '0 auto 16px', width: 32, height: 32 }} />
                <div style={{ fontSize: 14, color: '#64748b' }}>Memuat konfigurasi...</div>
              </div>
            ) : activeGroup === 'security' ? (
              renderSecurity()
            ) : (
              <div className="form-grid">
                {activeGroup === 'skin_ai' && (
                  <div className="ai-banner">
                    <div className="ai-banner-icon">
                      <i className="bx bx-brain" />
                    </div>
                    <div>
                      <h3 className="ai-banner-title">AI Skin Analyzer (OpenAI Vision)</h3>
                      <p className="ai-banner-desc">Masukkan API Key OpenAI dan aktifkan fitur untuk mulai menganalisis foto kulit pengguna secara real-time. Fitur ini akan mendeteksi masalah kulit dan merekomendasikan produk.</p>
                    </div>
                  </div>
                )}

                {activeGroup === 'payment' ? (
                  <>
                    {filtered.filter(cfg => !cfg.key.startsWith('payment_manual_')).map(cfg => (
                      <div key={cfg.key} className={`form-group ${cfg.type === 'textarea' ? 'full-width' : ''}`}>
                        <label className="form-label">{cfg.description}</label>
                        {renderInput(cfg)}
                      </div>
                    ))}
                    
                    {/* Manual Transfer Section */}
                    <div className="manual-transfer-card">
                      <div className={`manual-transfer-header ${editing['payment_manual_transfer_enabled'] === 'true' ? 'active' : ''}`}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          <div style={{ width: 48, height: 48, borderRadius: 12, background: editing['payment_manual_transfer_enabled'] === 'true' ? '#2563eb' : '#cbd5e1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, transition: '0.3s' }}>
                            <i className="bx bx-transfer" />
                          </div>
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Transfer Manual</div>
                            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Pembeli transfer ke rekening toko, lalu konfirmasi manual</div>
                          </div>
                        </div>
                        <div className="toggle-wrapper" onClick={() => handleChange('payment_manual_transfer_enabled', editing['payment_manual_transfer_enabled'] === 'true' ? 'false' : 'true')}>
                          <div className={`toggle-switch ${editing['payment_manual_transfer_enabled'] === 'true' ? 'active' : ''}`}>
                            <div className="toggle-thumb" />
                          </div>
                        </div>
                      </div>

                      {editing['payment_manual_transfer_enabled'] === 'true' && (
                        <div style={{ padding: 24, borderTop: '1px solid #bfdbfe' }}>
                          <div className="form-grid">
                            {filtered.filter(cfg => cfg.key.startsWith('payment_manual_') && cfg.key !== 'payment_manual_transfer_enabled').map(cfg => (
                              <div key={cfg.key} className={`form-group ${cfg.type === 'textarea' ? 'full-width' : ''}`}>
                                <label className="form-label">{cfg.description}</label>
                                {renderInput(cfg)}
                              </div>
                            ))}
                            
                            {(editing['payment_manual_bank_name'] || editing['payment_manual_account_number']) && (
                              <div className="preview-card">
                                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                                  <i className="bx bxs-bank" />
                                </div>
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 4 }}>Preview Rekening Tujuan</div>
                                  <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 2 }}>{editing['payment_manual_bank_name'] || '—'}</div>
                                  <div style={{ fontSize: 15, fontWeight: 600, opacity: 0.9 }}>{editing['payment_manual_account_number'] || '—'}</div>
                                  <div style={{ fontSize: 14, opacity: 0.7, marginTop: 4 }}>a.n. {editing['payment_manual_account_holder'] || '—'}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  filtered.map(cfg => (
                    <div key={cfg.key} className={`form-group ${cfg.type === 'textarea' ? 'full-width' : ''}`}>
                      <label className="form-label">{cfg.description}</label>
                      {renderInput(cfg)}
                    </div>
                  ))
                )}

                {activeGroup === 'notification' && (
                  <div className="test-email-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <i className="bx bx-paper-plane" style={{ fontSize: 20, color: '#8b5cf6' }} />
                      <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>Tes Pengiriman Email SMTP</span>
                    </div>
                    <p style={{ fontSize: 13.5, color: '#64748b', marginBottom: 20, lineHeight: 1.5 }}>Kirim email uji coba untuk memverifikasi bahwa konfigurasi SMTP Anda sudah berjalan dengan sukses. <strong style={{ color: '#ef4444' }}>Catatan:</strong> Pastikan Anda telah mengklik "Simpan Konfigurasi" terlebih dahulu.</p>
                    
                    <div style={{ display: 'flex', gap: 12, maxWidth: 500 }}>
                      <input
                        type="email"
                        placeholder="Masukkan email tujuan..."
                        value={testEmail}
                        onChange={e => setTestEmail(e.target.value)}
                        className="form-input"
                      />
                      <button
                        onClick={handleTestEmail}
                        disabled={testingEmail || !testEmail}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '0 24px', borderRadius: 12, border: 'none', background: '#8b5cf6', color: '#fff', fontWeight: 600, cursor: 'pointer', opacity: (testingEmail || !testEmail) ? 0.7 : 1, transition: '0.2s', whiteSpace: 'nowrap'
                        }}
                      >
                        {testingEmail ? <div className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff', width: 16, height: 16 }} /> : <i className="bx bx-send" />}
                        {testingEmail ? 'Mengirim...' : 'Tes Kirim'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Save Button */}
          {activeGroup !== 'security' && (
            <div className="panel-footer">
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? <div className="spinner" /> : <i className="bx bx-check-shield" style={{ fontSize: 20 }} />}
                {saving ? 'Menyimpan Perubahan...' : 'Simpan Konfigurasi'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
