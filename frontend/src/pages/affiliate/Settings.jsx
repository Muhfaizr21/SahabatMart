import React, { useState, useEffect, useCallback } from 'react';
import { fetchJson, AFFILIATE_API_BASE } from '../../lib/api';
import { getStoredUser } from '../../lib/auth';

const toast = (msg, type = 'success') => {
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText = `
    position: fixed; bottom: 24px; right: 24px; z-index: 9999;
    padding: 12px 20px; border-radius: 12px; font-size: 13px; font-weight: 700;
    background: ${type === 'success' ? '#7c3aed' : '#dc2626'};
    color: white; box-shadow: 0 8px 30px rgba(0,0,0,0.4);
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
};

const InputField = ({ label, name, type = 'text', value, onChange, placeholder, disabled }) => (
  <div>
    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{label}</label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 border outline-none transition-all focus:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: 'rgba(12, 19, 36, 0.6)',
        border: '1px solid rgba(77, 67, 84, 0.3)',
      }}
    />
  </div>
);

export default function AffiliateSettings() {
  const storedUser = getStoredUser();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    bank_name: '',
    bank_account_number: '',
    bank_account_name: '',
    postback_url: '',
  });

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchJson(`${AFFILIATE_API_BASE}/profile`);
      setProfile(res);
      const aff = res.affiliate || {};
      const user = res.user || {};
      setForm({
        full_name: user.profile?.full_name || '',
        bank_name: aff.bank_name || '',
        bank_account_number: aff.bank_account_number || '',
        bank_account_name: aff.bank_account_name || '',
        postback_url: aff.postback_url || '',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetchJson(`${AFFILIATE_API_BASE}/profile/update`, {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      toast('Profil berhasil diperbarui!');
    } catch (err) {
      toast(err.message || 'Gagal menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const baseStyle = {
    background: 'rgba(35, 41, 60, 0.4)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(77, 67, 84, 0.15)',
  };

  const tierName = profile?.affiliate?.tier?.name || 'Mitra Dasar';
  const tierLevel = profile?.affiliate?.tier?.level || 1;
  const tierRate = profile?.affiliate?.tier?.base_commission_rate
    ? `${(profile.affiliate.tier.base_commission_rate * 100).toFixed(1)}%`
    : '0%';
  const refCode = profile?.affiliate?.ref_code || storedUser?.affiliate_ref_code || 'SM-REF';
  const status = profile?.affiliate?.status || 'active';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-white font-['Plus_Jakarta_Sans']">
          <span style={{ background: 'linear-gradient(135deg, #ddb7ff, #b76dff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Pengaturan</span> Akun
        </h1>
        <p className="text-slate-400 text-sm mt-0.5">Kelola profil dan informasi rekening bank Anda</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-purple-500/30 border-t-purple-400 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Tier & Account Info */}
          <div className="space-y-5">
            {/* Tier Card */}
            <div className="rounded-2xl p-6" style={baseStyle}>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">
                Status Keanggotaan
              </p>

              <div className="flex items-center gap-4 mb-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #b76dff, #7c3aed)', color: 'white' }}
                >
                  {form.full_name?.charAt(0)?.toUpperCase() || 'A'}
                </div>
                <div>
                  <p className="text-white font-black text-lg font-['Plus_Jakarta_Sans']">{form.full_name || 'Affiliate'}</p>
                  <p className="text-purple-400 text-xs font-bold capitalize">{tierName} Partner</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 rounded-xl" style={{ background: 'rgba(12, 19, 36, 0.4)' }}>
                  <span className="text-xs text-slate-400">Kode Referral</span>
                  <span className="text-xs font-black text-white tracking-wider">{refCode}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl" style={{ background: 'rgba(12, 19, 36, 0.4)' }}>
                  <span className="text-xs text-slate-400">Tier Saat Ini</span>
                  <span className="text-xs font-bold text-purple-300">{tierName} (Lv.{tierLevel})</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl" style={{ background: 'rgba(12, 19, 36, 0.4)' }}>
                  <span className="text-xs text-slate-400">Rate Komisi</span>
                  <span className="text-xs font-black text-green-400">{tierRate}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl" style={{ background: 'rgba(12, 19, 36, 0.4)' }}>
                  <span className="text-xs text-slate-400">Status Akun</span>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                    style={{
                      color: status === 'active' ? '#4ade80' : '#fabc4e',
                      background: status === 'active' ? '#4ade8015' : '#fabc4e15',
                    }}
                  >
                    {status}
                  </span>
                </div>
              </div>
            </div>

            {/* Account Info */}
            <div className="rounded-2xl p-6" style={baseStyle}>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">
                Info Akun
              </p>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] text-slate-500 mb-0.5">Email</p>
                  <p className="text-sm font-semibold text-white">{profile?.user?.email || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 mb-0.5">Bergabung</p>
                  <p className="text-sm font-semibold text-white">
                    {profile?.affiliate?.created_at
                      ? new Date(profile.affiliate.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 mb-0.5">KTP Terdaftar</p>
                  <p className="text-sm font-semibold text-white">
                    {profile?.affiliate?.ktp_number ? `****${profile.affiliate.ktp_number.slice(-4)}` : 'Belum diisi'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Edit Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSave} className="space-y-6">
              {/* Personal Info */}
              <div className="rounded-2xl p-6" style={baseStyle}>
                <h3 className="text-white font-bold font-['Plus_Jakarta_Sans'] mb-5">Informasi Pribadi</h3>
                <InputField
                  label="Nama Lengkap"
                  name="full_name"
                  value={form.full_name}
                  onChange={handleChange}
                  placeholder="Masukkan nama lengkap"
                />
              </div>

              {/* Bank Info */}
              <div className="rounded-2xl p-6" style={baseStyle}>
                <h3 className="text-white font-bold font-['Plus_Jakarta_Sans'] mb-2">Rekening Bank</h3>
                <p className="text-slate-400 text-xs mb-5">
                  Data rekening ini akan digunakan untuk proses penarikan komisi
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField
                    label="Nama Bank"
                    name="bank_name"
                    value={form.bank_name}
                    onChange={handleChange}
                    placeholder="cth: BCA, Mandiri, BNI"
                  />
                  <InputField
                    label="Nomor Rekening"
                    name="bank_account_number"
                    type="text"
                    value={form.bank_account_number}
                    onChange={handleChange}
                    placeholder="cth: 1234567890"
                  />
                  <div className="md:col-span-2">
                    <InputField
                      label="Nama Pemilik Rekening"
                      name="bank_account_name"
                      value={form.bank_account_name}
                      onChange={handleChange}
                      placeholder="Sesuai buku tabungan"
                    />
                  </div>
                </div>
              </div>



              {/* Save Button */}
              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}
              >
                {saving ? (
                  <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <span className="material-symbols-outlined">save</span>
                )}
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
