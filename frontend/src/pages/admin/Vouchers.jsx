import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';

const API = ADMIN_API_BASE;
const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

const S = {
  page: { fontFamily: "'Inter', sans-serif", paddingTop: 20 },
  card: { background: '#fff', borderRadius: 16, border: '1px solid #f0f0f5', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' },
  label: { display: 'block', fontSize: 11.5, fontWeight: 700, color: '#64748b', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: 5 },
  input: { width: '100%', padding: '10px 13px', borderRadius: 9, border: '1.5px solid #e2e8f0', fontSize: 13.5, color: '#334155', background: '#f8fafc', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  select: { width: '100%', padding: '10px 13px', borderRadius: 9, border: '1.5px solid #e2e8f0', fontSize: 13.5, color: '#334155', background: '#f8fafc', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050 },
  modalBox: { background: '#fff', borderRadius: 20, width: '100%', maxWidth: 580, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', overflow: 'hidden' },
};

const VoucherCard = ({ v, onEdit }) => {
  const isActive = v.status === 'active';
  const usedPct = v.quota > 0 ? Math.round((v.used / v.quota) * 100) : 0;
  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0f0f5', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Card Top */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px dashed #f1f5f9' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eff6ff', color: '#4361ee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
            <i className="bx bxs-coupon" />
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: isActive ? '#d1fae5' : '#f1f5f9', color: isActive ? '#065f46' : '#64748b', fontSize: 11.5, fontWeight: 700 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? '#10b981' : '#94a3b8', display: 'inline-block' }} />
            {isActive ? 'AKTIF' : 'NONAKTIF'}
          </span>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>{v.title}</div>
        <div style={{ display: 'inline-block', fontFamily: 'monospace', fontSize: 15, fontWeight: 700, color: '#4361ee', background: '#eff6ff', padding: '4px 12px', borderRadius: 8, letterSpacing: '1px' }}>
          {v.code}
        </div>
      </div>
      {/* Card Stats */}
      <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flex: 1 }}>
        <div>
          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 3 }}>Diskon</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
            {v.discount_type === 'percent' ? `${v.discount_value}%` : fmt(v.discount_value)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 3 }}>Min. Order</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{fmt(v.min_order)}</div>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Penggunaan</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>{v.used || 0} / {v.quota}</span>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: '#f1f5f9', overflow: 'hidden' }}>
            <div style={{ width: `${usedPct}%`, height: '100%', background: usedPct > 80 ? '#f43f5e' : '#4361ee', borderRadius: 99, transition: 'width 0.4s' }} />
          </div>
        </div>
      </div>
      {/* Card Footer */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid #f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => onEdit(v)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, border: 'none', background: '#eff6ff', color: '#2563eb', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <i className="bx bx-pencil" style={{ fontSize: 15 }} /> Edit
        </button>
      </div>
    </div>
  );
};

const BLANK = { id: 0, code: '', title: '', discount_type: 'fixed', discount_value: 0, min_order: 0, quota: 100, status: 'active' };

export default function AdminVouchers() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetchJson(API + '/vouchers').then(d => setVouchers(d.data || [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = (e) => {
    e.preventDefault();
    setSaving(true);
    fetchJson(API + '/vouchers/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    }).then(() => { load(); setShowModal(false); setSaving(false); })
      .catch(() => setSaving(false));
  };

  const openCreate = () => { setFormData(BLANK); setShowModal(true); };
  const openEdit = (v) => { setFormData({ ...v }); setShowModal(true); };

  return (
    <div style={S.page} className="fade-in px-3">
      {/* Breadcrumb */}
      <div className="d-none d-sm-flex align-items-center justify-content-between mb-4">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Platform Vouchers</span>
          <i className="bx bx-chevron-right" style={{ color: '#cbd5e1', fontSize: 20 }} />
          <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 500 }}>Campaign Manager</span>
        </div>
        <button onClick={openCreate} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 10, border: 'none', background: '#4361ee', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
          <i className="bx bx-plus" style={{ fontSize: 18 }} /> Buat Voucher
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div className="spinner-border" style={{ color: '#4361ee', width: 34, height: 34, borderWidth: 3 }} />
          <div style={{ marginTop: 14, fontSize: 13, color: '#94a3b8' }}>Memuat data voucher...</div>
        </div>
      ) : vouchers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#94a3b8' }}>
          <i className="bx bxs-coupon" style={{ fontSize: 56, display: 'block', marginBottom: 16, opacity: 0.25 }} />
          <div style={{ fontWeight: 700, fontSize: 16, color: '#475569', marginBottom: 8 }}>Belum ada voucher aktif</div>
          <div style={{ fontSize: 13, marginBottom: 20 }}>Buat kampanye promosi pertama Anda sekarang.</div>
          <button onClick={openCreate} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 10, border: 'none', background: '#4361ee', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            <i className="bx bx-plus" /> Buat Voucher Pertama
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {vouchers.map(v => <VoucherCard key={v.id} v={v} onEdit={openEdit} />)}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={S.modalOverlay} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={S.modalBox}>
            {/* Modal Header */}
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eff6ff', color: '#4361ee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  <i className="bx bxs-coupon" />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{formData.id ? 'Edit Voucher' : 'Buat Voucher Baru'}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>Isi detail kampanye promosi</div>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 22, lineHeight: 1 }}>
                <i className="bx bx-x" />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ padding: '20px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={S.label}>Judul Kampanye</label>
                  <input style={S.input} type="text" placeholder="Contoh: Flash Sale Akhir Bulan" required
                    value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })}
                    onFocus={e => e.target.style.borderColor = '#818cf8'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </div>
                <div>
                  <label style={S.label}>Kode Voucher</label>
                  <input style={{ ...S.input, fontFamily: 'monospace', fontWeight: 700, color: '#4361ee', letterSpacing: '1px' }} type="text" placeholder="FLASH50"
                    value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    onFocus={e => e.target.style.borderColor = '#818cf8'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </div>
                <div>
                  <label style={S.label}>Status</label>
                  <select style={S.select} value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </div>
                <div>
                  <label style={S.label}>Tipe Diskon</label>
                  <select style={S.select} value={formData.discount_type} onChange={e => setFormData({ ...formData, discount_type: e.target.value })}>
                    <option value="fixed">Nominal (IDR)</option>
                    <option value="percent">Persentase (%)</option>
                  </select>
                </div>
                <div>
                  <label style={S.label}>Nilai Diskon</label>
                  <input style={S.input} type="number" min={0} value={formData.discount_value}
                    onChange={e => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                    onFocus={e => e.target.style.borderColor = '#818cf8'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </div>
                <div>
                  <label style={S.label}>Min. Pembelian (IDR)</label>
                  <input style={S.input} type="number" min={0} value={formData.min_order}
                    onChange={e => setFormData({ ...formData, min_order: parseFloat(e.target.value) || 0 })}
                    onFocus={e => e.target.style.borderColor = '#818cf8'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </div>
                <div>
                  <label style={S.label}>Kuota Penggunaan</label>
                  <input style={S.input} type="number" min={1} value={formData.quota}
                    onChange={e => setFormData({ ...formData, quota: parseInt(e.target.value) || 1 })}
                    onFocus={e => e.target.style.borderColor = '#818cf8'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 20px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
                  Batal
                </button>
                <button type="submit" disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 10, border: 'none', background: '#4361ee', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
                  {saving ? <div className="spinner-border spinner-border-sm" style={{ width: 16, height: 16 }} /> : <i className="bx bx-save" style={{ fontSize: 17 }} />}
                  {saving ? 'Menyimpan...' : (formData.id ? 'Update Voucher' : 'Buat Voucher')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
