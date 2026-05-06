import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';
import { PageHeader, Modal, FieldLabel, statusBadge, idr, fmtDate, A } from '../../lib/adminStyles.jsx';

const API = ADMIN_API_BASE;

const VOUCHER_TYPE_LABELS = {
  platform:    { label: 'Platform Umum', icon: '🎟️', color: '#6366f1', desc: 'Berlaku untuk semua produk' },
  first_order: { label: 'Pembelian Pertama', icon: '🥇', color: '#f59e0b', desc: 'Hanya untuk pelanggan baru (1x pakai)' },
  group:       { label: 'Kategori Produk', icon: '📂', color: '#10b981', desc: 'Berlaku untuk kategori tertentu' },
  product:     { label: 'Produk Spesifik', icon: '📦', color: '#3b82f6', desc: 'Berlaku untuk produk tertentu saja' },
  cart_value:  { label: 'Nilai Keranjang', icon: '🛒', color: '#8b5cf6', desc: 'Berlaku jika nilai belanja mencapai nominal tertentu' },
};

export default function AdminVouchers() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const EMPTY = { 
    id: 0, code: '', title: '', description: '',
    voucher_type: 'platform',
    discount_type: 'fixed', discount_value: 0, max_discount: 0,
    min_order: 0, cart_min_value: 0,
    target_group: '', target_product: '',
    quota: 100, status: 'active',
    expiry_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().slice(0, 16)
  };

  const load = () => {
    setLoading(true);
    fetchJson(`${API}/vouchers`)
      .then(d => setVouchers(Array.isArray(d) ? d : (d?.data || [])))
      .catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const save = () => {
    if (!modal.code || !modal.title) { alert('Kode dan judul voucher wajib diisi'); return; }
    setSaving(true);
    fetchJson(`${API}/vouchers/upsert`, { method: 'POST', body: JSON.stringify(modal) })
      .then(() => { load(); setModal(null); })
      .catch(e => alert(e.message))
      .finally(() => setSaving(false));
  };

  const del = (id) => {
    if (!window.confirm('Hapus voucher ini?')) return;
    fetchJson(`${API}/vouchers/delete?id=${id}`, { method: 'DELETE' }).then(load).catch(e => alert(e.message));
  };

  const typeInfo = (t) => VOUCHER_TYPE_LABELS[t] || VOUCHER_TYPE_LABELS.platform;

  return (
    <div style={A.page} className="fade-in">
      <PageHeader title="Marketing Vouchers" subtitle="Kelola 4 tipe voucher: Platform, Pembelian Pertama, Kategori, Produk Spesifik, dan Nilai Keranjang.">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', width: '100%' }}>
          <button style={{ ...A.btnPrimary, flex: '1 1 auto' }} onClick={() => setModal({...EMPTY})}>
            <i className="bx bx-plus" /> Buat Voucher
          </button>
        </div>
      </PageHeader>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {Object.entries(VOUCHER_TYPE_LABELS).map(([key, info]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: `1px solid ${info.color}22`, borderRadius: 10, padding: '5px 12px' }}>
            <span>{info.icon}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: info.color }}>{info.label}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Memuat...</div>
      ) : vouchers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9' }}>
          <i className="bx bxs-coupon" style={{ fontSize: 48, display: 'block', marginBottom: 12, opacity: 0.2, color: '#6366f1' }} />
          <p style={{ color: '#94a3b8', fontWeight: 600 }}>Belum ada voucher. Buat yang pertama!</p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: window.innerWidth < 400 ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', 
          gap: 16 
        }}>
          {vouchers.map(v => {
            const usedPct = v.quota > 0 ? Math.round((v.used || 0) / v.quota * 100) : 0;
            const isActive = v.status === 'active';
            const ti = typeInfo(v.voucher_type);
            return (
              <div key={v.id} style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
                {/* Color strip */}
                <div style={{ height: 4, background: isActive ? `linear-gradient(90deg, ${ti.color}, ${ti.color}99)` : '#e2e8f0' }} />
                <div style={{ padding: '18px 20px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: `${ti.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                        {ti.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 800, color: ti.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{ti.label}</div>
                        <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 800, color: '#6366f1', background: '#eef2ff', display: 'inline-block', padding: '2px 8px', borderRadius: 6, letterSpacing: 1 }}>{v.code}</div>
                      </div>
                    </div>
                    <span style={statusBadge(v.status)}>{v.status}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 3 }}>{v.title}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12, minHeight: 16 }}>{v.description || ti.desc}</div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, borderTop: '1px dashed #f1f5f9', paddingTop: 12 }}>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Diskon</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                        {v.discount_type === 'percent' ? `${v.discount_value}%` : idr(v.discount_value)}
                        {v.max_discount > 0 && v.discount_type === 'percent' && (
                          <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, marginLeft: 4 }}>(max {idr(v.max_discount)})</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Min. Order</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{idr(v.min_order)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Kadaluarsa</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{fmtDate(v.expiry_date)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Kuota</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{v.used || 0} / {v.quota}</div>
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <div style={{ height: 5, background: '#f1f5f9', borderRadius: 10, overflow: 'hidden', marginTop: 4 }}>
                        <div style={{ height: '100%', width: `${usedPct}%`, background: usedPct > 80 ? '#ef4444' : ti.color, borderRadius: 10, transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  </div>

                  {/* Target info pill */}
                  {(v.target_group || v.target_product) && (
                    <div style={{ marginTop: 10, padding: '5px 10px', background: `${ti.color}10`, borderRadius: 8, fontSize: 10, color: ti.color, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                      <i className="bx bx-target-lock" />
                      {v.target_group && <span>Kategori: {v.target_group}</span>}
                      {v.target_product && <span>Produk: {v.target_product.substring(0, 24)}{v.target_product.length > 24 ? '...' : ''}</span>}
                    </div>
                  )}
                </div>
                <div style={{ padding: '10px 20px 16px', display: 'flex', gap: 8, marginTop: 'auto' }}>
                  <button onClick={() => setModal({...v})} style={{ flex: 1, padding: '8px', borderRadius: 11, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 12, color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    <i className="bx bx-pencil" style={{ fontSize: 14 }} /> Edit
                  </button>
                  <button onClick={() => del(v.id)} style={{ flex: 1, padding: '8px', borderRadius: 11, border: '1px solid #fee2e2', background: '#fff1f2', cursor: 'pointer', fontWeight: 700, fontSize: 12, color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    <i className="bx bx-trash" style={{ fontSize: 14 }} /> Hapus
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <Modal title={modal.id ? 'Edit Voucher' : 'Buat Voucher Baru'} onClose={() => setModal(null)} wide>
          <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 640 ? '1fr' : '1fr 1fr', gap: 14 }}>
            {/* ── Judul & Kode ── */}
            <div style={{ gridColumn: '1/-1' }}>
              <FieldLabel>Judul Voucher</FieldLabel>
              <input style={{ ...A.select, width: '100%' }} placeholder="Promo Ramadhan Berkah" value={modal.title} onChange={e => setModal(p => ({...p, title: e.target.value}))} />
            </div>
            <div>
              <FieldLabel>Kode (Unik)</FieldLabel>
              <input style={{ ...A.select, width: '100%', fontFamily: 'monospace', fontWeight: 800, color: '#6366f1' }} placeholder="KODE123" value={modal.code} onChange={e => setModal(p => ({...p, code: e.target.value.toUpperCase()}))} />
            </div>
            <div>
              <FieldLabel>Status</FieldLabel>
              <select style={{ ...A.select, width: '100%' }} value={modal.status} onChange={e => setModal(p => ({...p, status: e.target.value}))}>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <FieldLabel>Deskripsi Kupon</FieldLabel>
              <input style={{ ...A.select, width: '100%' }} placeholder="Deskripsi untuk menarik pembeli..." value={modal.description} onChange={e => setModal(p => ({...p, description: e.target.value}))} />
            </div>

            {/* ── Tipe Voucher ── */}
            <div style={{ gridColumn: '1/-1' }}>
              <FieldLabel>Tipe Voucher</FieldLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
                {Object.entries(VOUCHER_TYPE_LABELS).map(([key, info]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setModal(p => ({...p, voucher_type: key}))}
                    style={{
                      padding: '10px 12px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                      border: modal.voucher_type === key ? `2px solid ${info.color}` : '1px solid #e2e8f0',
                      background: modal.voucher_type === key ? `${info.color}10` : '#fff',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ fontSize: 18, marginBottom: 4 }}>{info.icon}</div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: modal.voucher_type === key ? info.color : '#334155' }}>{info.label}</div>
                    <div style={{ fontSize: 9.5, color: '#94a3b8', marginTop: 2, lineHeight: 1.4 }}>{info.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Conditional fields by type ── */}
            {modal.voucher_type === 'group' && (
              <div style={{ gridColumn: '1/-1' }}>
                <FieldLabel>Target Kategori (pisah koma)</FieldLabel>
                <input style={{ ...A.select, width: '100%' }} placeholder="Skincare, Makeup, Suplemen" value={modal.target_group} onChange={e => setModal(p => ({...p, target_group: e.target.value}))} />
              </div>
            )}
            {modal.voucher_type === 'product' && (
              <div style={{ gridColumn: '1/-1' }}>
                <FieldLabel>Target Product ID (pisah koma)</FieldLabel>
                <input style={{ ...A.select, width: '100%', fontSize: 11, fontFamily: 'monospace' }} placeholder="uuid-1, uuid-2, ..." value={modal.target_product} onChange={e => setModal(p => ({...p, target_product: e.target.value}))} />
              </div>
            )}
            {modal.voucher_type === 'cart_value' && (
              <div>
                <FieldLabel>Nilai Keranjang Minimal (Rp)</FieldLabel>
                <input type="number" style={{ ...A.select, width: '100%' }} value={modal.cart_min_value} onChange={e => setModal(p => ({...p, cart_min_value: parseFloat(e.target.value) || 0}))} />
              </div>
            )}

            {/* ── Diskon ── */}
            <div>
              <FieldLabel>Tipe Diskon</FieldLabel>
              <select style={{ ...A.select, width: '100%' }} value={modal.discount_type} onChange={e => setModal(p => ({...p, discount_type: e.target.value}))}>
                <option value="fixed">Nominal (IDR)</option>
                <option value="percent">Persentase (%)</option>
              </select>
            </div>
            <div>
              <FieldLabel>Nilai Diskon {modal.discount_type === 'percent' ? '(%)' : '(Rp)'}</FieldLabel>
              <input type="number" style={{ ...A.select, width: '100%' }} value={modal.discount_value} onChange={e => setModal(p => ({...p, discount_value: parseFloat(e.target.value) || 0}))} />
            </div>
            {modal.discount_type === 'percent' && (
              <div>
                <FieldLabel>Maks. Diskon (Rp) — 0 = tidak ada cap</FieldLabel>
                <input type="number" style={{ ...A.select, width: '100%' }} value={modal.max_discount} onChange={e => setModal(p => ({...p, max_discount: parseFloat(e.target.value) || 0}))} />
              </div>
            )}
            <div>
              <FieldLabel>Min. Pembelian (Rp)</FieldLabel>
              <input type="number" style={{ ...A.select, width: '100%' }} value={modal.min_order} onChange={e => setModal(p => ({...p, min_order: parseFloat(e.target.value) || 0}))} />
            </div>
            <div>
              <FieldLabel>Kuota Total</FieldLabel>
              <input type="number" style={{ ...A.select, width: '100%' }} value={modal.quota} onChange={e => setModal(p => ({...p, quota: parseInt(e.target.value) || 0}))} />
            </div>
            <div>
              <FieldLabel>Tanggal Kedaluwarsa</FieldLabel>
              <input type="datetime-local" style={{ ...A.select, width: '100%' }} value={modal.expiry_date ? new Date(modal.expiry_date).toISOString().slice(0, 16) : ''} onChange={e => setModal(p => ({...p, expiry_date: new Date(e.target.value).toISOString()}))} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 20 }}>
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
