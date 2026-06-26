import React, { useState, useEffect, useCallback, useRef } from 'react';
import { fetchJson, uploadFile, formatImage, AFFILIATE_API_BASE } from '../../lib/api';
import { getStoredUser } from '../../lib/auth';
import toast from 'react-hot-toast';

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
  const fileInputRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [form, setForm] = useState({
    email: '',
    full_name: '',
    avatar_url: '',
    bank_name: '',
    bank_account_number: '',
    bank_account_name: '',
    postback_url: '',
    ktp_number: '',
  });

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchJson(`${AFFILIATE_API_BASE}/profile`);
      setProfile(res);
      const aff = res.affiliate || {};
      const user = res.user || {};
      setForm({
        email: user.email || '',
        full_name: user.profile?.full_name || '',
        avatar_url: user.profile?.avatar_url || '',
        bank_name: aff.bank_name || '',
        bank_account_number: aff.bank_account_number || '',
        bank_account_name: aff.bank_account_name || '',
        postback_url: aff.postback_url || '',
        ktp_number: aff.ktp_number || '',
      });
      
      // Fetch eligibility
      try {
        const elig = await fetchJson(`${AFFILIATE_API_BASE}/merchant-eligibility`);
        setEligibility(elig);
      } catch (e) {
        console.error("Gagal memuat eligibility:", e);
      }
    } catch (_err) {
      toast.error('Gagal memuat profil');
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

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const res = await uploadFile(`${AFFILIATE_API_BASE}/upload`, file);
      const imageUrl = res.url || (res.data && res.data.url);
      if (imageUrl) {
        const newForm = { ...form, avatar_url: imageUrl };
        setForm(newForm);
        // Auto-save langsung ke backend
        await fetchJson(`${AFFILIATE_API_BASE}/profile/update`, {
          method: 'PUT',
          body: JSON.stringify({ avatar_url: imageUrl }),
        });
        toast('Foto profil berhasil diperbarui!');
      }
    } catch (_err) {
      toast('Gagal upload foto: ' + _err.message, 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // [BUG-S1 Fix] Hanya kirim field yang diisi — jangan kirim postback_url kosong
      // agar tidak overwrite value yang sudah diset admin.
      const payload = {};
      if (form.email) payload.email = form.email;
      if (form.full_name) payload.full_name = form.full_name;
      if (form.avatar_url) payload.avatar_url = form.avatar_url;
      if (form.bank_name) payload.bank_name = form.bank_name;
      if (form.bank_account_number) payload.bank_account_number = form.bank_account_number;
      if (form.bank_account_name) payload.bank_account_name = form.bank_account_name;
      if (form.ktp_number) payload.ktp_number = form.ktp_number;
      // postback_url tidak dikirim dari form — diatur oleh admin via panel

      await fetchJson(`${AFFILIATE_API_BASE}/profile/update`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      toast.success('Profil berhasil diperbarui!');
      fetchProfile(); // Reload to refresh stored tokens/details
    } catch (_err) {
      toast.error(_err.message || 'Gagal menyimpan');
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
                <div className="relative">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarUpload}
                    className="hidden"
                    accept="image/*"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-14 h-14 rounded-2xl overflow-hidden cursor-pointer relative group"
                    style={{ background: 'linear-gradient(135deg, #b76dff, #7c3aed)' }}
                  >
                    {form.avatar_url ? (
                      <img
                        src={formatImage(form.avatar_url)}
                        alt="Foto Profil"
                        className="w-full h-full object-cover"
                        style={{ opacity: uploadingAvatar ? 0.5 : 1 }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl font-black text-white">
                        {form.full_name?.charAt(0)?.toUpperCase() || 'A'}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="material-symbols-outlined text-white text-sm">{uploadingAvatar ? 'hourglass_empty' : 'photo_camera'}</span>
                    </div>
                  </div>
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

            {/* Syarat Naik Level Card */}
            {eligibility && (
              <div className="rounded-2xl p-6" style={baseStyle}>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">
                  Syarat Naik Level
                </p>
                {eligibility.next_tier ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-black text-white">Level Selanjutnya</span>
                      <span className="text-[10px] bg-purple-500/20 text-purple-300 font-bold px-2 py-0.5 rounded-full uppercase">
                        {eligibility.next_tier.name}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {/* 1. Mitra Aktif */}
                      {eligibility.requirements.min_mitra > 0 && (
                        <div>
                          <div className="flex justify-between text-[11px] font-bold mb-1">
                            <span className="text-slate-400">Mitra Aktif</span>
                            <span className="text-white">
                              {eligibility.active_mitra} / {eligibility.requirements.min_mitra}
                            </span>
                          </div>
                          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, (eligibility.active_mitra / eligibility.requirements.min_mitra) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* 2. Turnover Bulanan */}
                      {eligibility.requirements.min_turnover > 0 && (
                        <div>
                          <div className="flex justify-between text-[11px] font-bold mb-1">
                            <span className="text-slate-400">Omset Bulanan</span>
                            <span className="text-white">
                              Rp {Number(eligibility.monthly_turnover).toLocaleString('id-ID')} / Rp {Number(eligibility.requirements.min_turnover).toLocaleString('id-ID')}
                            </span>
                          </div>
                          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, (eligibility.monthly_turnover / eligibility.requirements.min_turnover) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* 3. Total Transaksi */}
                      {eligibility.requirements.min_total_transactions > 0 && (
                        <div>
                          <div className="flex justify-between text-[11px] font-bold mb-1">
                            <span className="text-slate-400">Total Transaksi</span>
                            <span className="text-white">
                              {eligibility.total_transactions} / {eligibility.requirements.min_total_transactions}
                            </span>
                          </div>
                          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, (eligibility.total_transactions / eligibility.requirements.min_total_transactions) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* 4. Mitra Langsung */}
                      {eligibility.requirements.min_referrals > 0 && (
                        <div>
                          <div className="flex justify-between text-[11px] font-bold mb-1">
                            <span className="text-slate-400">Referral Langsung</span>
                            <span className="text-white">
                              {eligibility.direct_mitra} / {eligibility.requirements.min_referrals}
                            </span>
                          </div>
                          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, (eligibility.direct_mitra / eligibility.requirements.min_referrals) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* 5. Performance Points */}
                      {eligibility.requirements.min_performance_points > 0 && (
                        <div>
                          <div className="flex justify-between text-[11px] font-bold mb-1">
                            <span className="text-slate-400">Poin Performa</span>
                            <span className="text-white">
                              {eligibility.performance_points} / {eligibility.requirements.min_performance_points}
                            </span>
                          </div>
                          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, (eligibility.performance_points / eligibility.requirements.min_performance_points) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <span className="material-symbols-outlined text-4xl mb-2 block text-amber-400">emoji_events</span>
                    <p className="text-xs font-black text-amber-400 uppercase tracking-widest">Level Tertinggi</p>
                    <p className="text-[10px] text-slate-500 mt-1">Anda berada pada level keanggotaan tertinggi.</p>
                  </div>
                )}
              </div>
            )}

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
                <div className="space-y-4">
                  <InputField
                    label="Nama Lengkap"
                    name="full_name"
                    value={form.full_name}
                    onChange={handleChange}
                    placeholder="Masukkan nama lengkap"
                  />
                  <InputField
                    label="Email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Masukkan email baru"
                  />
                  <InputField
                    label="Nomor KTP (NIK)"
                    name="ktp_number"
                    type="text"
                    value={form.ktp_number}
                    onChange={handleChange}
                    placeholder="Masukkan 16 digit Nomor KTP"
                  />
                </div>
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
